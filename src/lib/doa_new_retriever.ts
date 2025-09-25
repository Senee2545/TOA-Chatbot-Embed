import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "./supabase/server";
 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDOARetrieverNew(k = 5,filter: Record<string, any> = {}) {
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-large" });
  const supabase = await createClient();
 
  const store = new SupabaseVectorStore(embeddings, {
    client: supabase,
    tableName: "doa_documents",
    queryName: "match_doa_documents",
  });
 
  
  
console.log("filter",filter);
  // ถ้าไม่ → ไม่ต้อง filter
  if(filter.no){
  return store.asRetriever(k,{no:filter.no});
}
return store.asRetriever(k);
 
}