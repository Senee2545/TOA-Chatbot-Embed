import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "./supabase/server";

export async function getDOARetrieverNew(k = 5) {
  
  const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-large' });
  const supabase = await createClient();
  const store = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "doa_documents",
    queryName: "match_doa_documents",
  });

  return store.asRetriever(k);
}
