import Anthropic from "@anthropic-ai/sdk";
import type { Message } from "@/types/domain";
import type { MatchedFaq } from "@/features/faq/search-faqs";
import { buildSystemPrompt } from "./system-prompt";
import { AI_RESPONSE_JSON_SCHEMA } from "./response-schema";

// D-014: AI応答生成にはClaude Sonnet 5を使用する
const MODEL = "claude-sonnet-5";
const MAX_TOKENS = 2048;

function toClaudeRole(senderType: Message["senderType"]): "user" | "assistant" {
  return senderType === "customer" ? "user" : "assistant";
}

/**
 * Claudeを呼び出し、構造化出力（JSON文字列）を返す。パース・検証は呼び出し側の責務とする
 * （src/features/ai/validate-response.ts）。
 */
export async function callClaude(
  history: Message[],
  matchedFaqs: MatchedFaq[],
  isAfterHours: boolean,
): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(matchedFaqs, isAfterHours),
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: AI_RESPONSE_JSON_SCHEMA,
      },
    },
    messages: history.map((message) => ({
      role: toClaudeRole(message.senderType),
      content: message.content,
    })),
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined to respond (safety refusal)");
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response did not contain a text block");
  }

  return textBlock.text;
}
