import OpenAI from "openai";

// D-011: FAQ検索のEmbeddingモデルはOpenAI text-embedding-3-small（1536次元）に確定済み
const EMBEDDING_MODEL = "text-embedding-3-small";

export async function embedQuery(text: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return response.data[0].embedding;
}
