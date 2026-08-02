import { createAdminClient } from "@/lib/supabase/create-admin-client";
import type { ConversationCategory } from "@/types/domain";
import { embedQuery } from "./embed-query";

// D-011: 上位3件、類似度初期閾値0.75（コサイン類似度）
const MATCH_COUNT = 3;
export const SIMILARITY_THRESHOLD = 0.75;

export interface MatchedFaq {
  id: string;
  category: ConversationCategory;
  question: string;
  answer: string;
  similarity: number;
}

interface MatchFaqsRow {
  id: string;
  category: ConversationCategory;
  question: string;
  answer: string;
  similarity: number;
}

/**
 * 顧客メッセージに関連するFAQを検索する。faqsにはRLSポリシーが存在しないため
 * （SECURITY.md §4）、admin client（service role）経由でのみアクセスする。
 * 類似度が閾値未満のFAQは除外する（D-011、FR-06 low_similarity）。
 */
export async function searchFaqs(
  customerMessage: string,
): Promise<MatchedFaq[]> {
  const embedding = await embedQuery(customerMessage);
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("match_faqs", {
    query_embedding: embedding,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw new Error(`Failed to search faqs: ${error.message}`);
  }

  return ((data as MatchFaqsRow[] | null) ?? []).filter(
    (row) => row.similarity >= SIMILARITY_THRESHOLD,
  );
}
