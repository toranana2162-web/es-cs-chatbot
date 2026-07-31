import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { createAdminClient } from "../src/lib/supabase/create-admin-client";

// D-011: FAQ検索のEmbeddingモデルはOpenAI text-embedding-3-small（1536次元）に確定済み
const EMBEDDING_MODEL = "text-embedding-3-small";

interface FaqSeedEntry {
  category: string;
  question: string;
  answer: string;
}

async function main() {
  const faqPath = path.resolve(__dirname, "../FAQ.json");
  const faqs: FaqSeedEntry[] = JSON.parse(readFileSync(faqPath, "utf-8"));

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createAdminClient();

  for (const faq of faqs) {
    const embeddingResponse = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: faq.question,
    });
    const embedding = embeddingResponse.data[0].embedding;

    // is_activeは全件trueで統一する（DATABASE.md §8投入方針）
    const { error } = await supabase.from("faqs").insert({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      embedding,
      is_active: true,
    });

    if (error) {
      throw new Error(
        `Failed to insert FAQ "${faq.question}": ${error.message}`,
      );
    }

    console.log(`Inserted: [${faq.category}] ${faq.question}`);
  }

  console.log(`Done. Inserted ${faqs.length} FAQs.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
