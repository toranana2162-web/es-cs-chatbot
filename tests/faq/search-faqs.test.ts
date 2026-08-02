import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcMock, embedQueryMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  embedQueryMock: vi.fn(),
}));

vi.mock("@/lib/supabase/create-admin-client", () => ({
  createAdminClient: () => ({ rpc: rpcMock }),
}));

vi.mock("@/features/faq/embed-query", () => ({
  embedQuery: embedQueryMock,
}));

const { searchFaqs, SIMILARITY_THRESHOLD } =
  await import("@/features/faq/search-faqs");

beforeEach(() => {
  vi.clearAllMocks();
  embedQueryMock.mockResolvedValue([0.1, 0.2, 0.3]);
});

describe("searchFaqs", () => {
  it("閾値以上のFAQのみ返す", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "1",
          category: "shipping",
          question: "Q1",
          answer: "A1",
          similarity: 0.9,
        },
        {
          id: "2",
          category: "shipping",
          question: "Q2",
          answer: "A2",
          similarity: 0.5,
        },
      ],
      error: null,
    });

    const result = await searchFaqs("送料はいくらですか");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("閾値ちょうどの場合は含める", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          id: "1",
          category: "shipping",
          question: "Q1",
          answer: "A1",
          similarity: SIMILARITY_THRESHOLD,
        },
      ],
      error: null,
    });

    const result = await searchFaqs("送料");
    expect(result).toHaveLength(1);
  });

  it("マッチが0件の場合は空配列を返す", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });
    const result = await searchFaqs("今日の天気は");
    expect(result).toEqual([]);
  });

  it("RPCエラー時は例外を投げる", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(searchFaqs("送料")).rejects.toThrow();
  });
});
