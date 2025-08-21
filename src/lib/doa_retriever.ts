import { OpenAIEmbeddings } from "@langchain/openai";
import { CacheBackedEmbeddings } from "langchain/embeddings/cache_backed";
import { InMemoryStore } from "@langchain/core/stores";

import { createClient } from "./supabase/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

export async function getDOARetriever() {
    const supabase = await createClient();

    const underlyingEmbeddings = new OpenAIEmbeddings({
        model: 'text-embedding-3-large'
    });
 
    const inMemoryStore = new InMemoryStore();
    const cacheBackedEmbeddings = CacheBackedEmbeddings.fromBytesStore(
        underlyingEmbeddings,
        inMemoryStore,
        {
            namespace: underlyingEmbeddings.model
        }
    );

    const vectorStore = new SupabaseVectorStore(cacheBackedEmbeddings, {
        client: supabase,
        tableName: 'documents_doa',
        queryName: 'match_documents_doa',
    });

    const retriever = vectorStore.asRetriever({ k: 5 });

    return retriever;

}