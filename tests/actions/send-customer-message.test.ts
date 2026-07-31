import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  conversationsInsertMock,
  messagesInsertMock,
  assertWithinRateLimitMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  conversationsInsertMock: vi.fn(),
  messagesInsertMock: vi.fn(),
  assertWithinRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: (table: string) => {
      if (table === "conversations") {
        return {
          insert: () => ({
            select: () => ({
              single: conversationsInsertMock,
            }),
          }),
        };
      }
      if (table === "messages") {
        return { insert: messagesInsertMock };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  })),
}));

// rate-limit.tsの実体は@/lib/supabase/admin（server-onlyガード付き）をimportするため、
// importActualは使わずRateLimitExceededErrorも含めて完全にモックする。
class MockRateLimitExceededError extends Error {}

vi.mock("@/lib/validation/rate-limit", () => ({
  RateLimitExceededError: MockRateLimitExceededError,
  assertWithinRateLimit: assertWithinRateLimitMock,
}));

const { sendCustomerMessage } = await import("@/actions/send-customer-message");

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
  assertWithinRateLimitMock.mockResolvedValue(undefined);
  messagesInsertMock.mockResolvedValue({ data: null, error: null });
});

describe("sendCustomerMessage", () => {
  it("空文字は拒否する", async () => {
    const result = await sendCustomerMessage("conv-1", "   ");
    expect(result.success).toBe(false);
    expect(messagesInsertMock).not.toHaveBeenCalled();
  });

  it("1000文字を超えるメッセージは拒否する", async () => {
    const result = await sendCustomerMessage("conv-1", "あ".repeat(1001));
    expect(result.success).toBe(false);
  });

  it("認証セッションがない場合は失敗を返す", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    const result = await sendCustomerMessage("conv-1", "こんにちは");
    expect(result.success).toBe(false);
    expect(messagesInsertMock).not.toHaveBeenCalled();
  });

  it("レート制限超過時は失敗を返しmessagesへ書き込まない", async () => {
    assertWithinRateLimitMock.mockRejectedValue(
      new MockRateLimitExceededError("送信回数の上限を超えました。"),
    );
    const result = await sendCustomerMessage("conv-1", "こんにちは");
    expect(result.success).toBe(false);
    expect(messagesInsertMock).not.toHaveBeenCalled();
  });

  it("既存のconversationIdがある場合は会話を新規作成しない", async () => {
    const result = await sendCustomerMessage("conv-1", "在庫はありますか");
    expect(result.success).toBe(true);
    expect(result.conversationId).toBe("conv-1");
    expect(conversationsInsertMock).not.toHaveBeenCalled();
    expect(messagesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation_id: "conv-1",
        sender_type: "customer",
        sender_id: "user-1",
        content: "在庫はありますか",
      }),
    );
  });

  it("conversationIdがnullの場合は新しい会話を作成してから送信する", async () => {
    conversationsInsertMock.mockResolvedValue({
      data: { id: "new-conv" },
      error: null,
    });
    const result = await sendCustomerMessage(null, "はじめまして");
    expect(result.success).toBe(true);
    expect(result.conversationId).toBe("new-conv");
    expect(messagesInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ conversation_id: "new-conv" }),
    );
  });

  it("会話作成に失敗した場合は失敗を返す", async () => {
    conversationsInsertMock.mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });
    const result = await sendCustomerMessage(null, "はじめまして");
    expect(result.success).toBe(false);
    expect(messagesInsertMock).not.toHaveBeenCalled();
  });

  it("メッセージ保存に失敗した場合は失敗を返す", async () => {
    messagesInsertMock.mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });
    const result = await sendCustomerMessage("conv-1", "こんにちは");
    expect(result.success).toBe(false);
  });
});
