"""
RAG Assistant — retrieves ChromaDB context, formats a Llama-3 prompt,
and generates an answer via the local quantized LLM.
"""

import os
import time
import logging

import chromadb
from chromadb.utils import embedding_functions

from backend.ml.llm_inference import llm_service

logger = logging.getLogger(__name__)


class RAGAssistant:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.db_path = os.path.abspath("backend/data/chromadb")
        self._init_db()

    # ── ChromaDB ─────────────────────────────────────────────
    def _init_db(self):
        try:
            os.makedirs(self.db_path, exist_ok=True)

            self.chroma_client = chromadb.PersistentClient(path=self.db_path)

            self.embedding_fn = (
                embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            )

            # Use the exact collection name from your vector store
            try:
                self.collection = self.chroma_client.get_collection(
                    name="medguardian_knowledge",
                    embedding_function=self.embedding_fn,
                )
                logger.info(
                    "ChromaDB: loaded collection 'medguardian_knowledge' "
                    "(%d documents)",
                    self.collection.count(),
                )
            except Exception:
                # Collection does not exist yet — create an empty one
                self.collection = self.chroma_client.get_or_create_collection(
                    name="medguardian_knowledge",
                    embedding_function=self.embedding_fn,
                )
                logger.warning(
                    "ChromaDB: 'medguardian_knowledge' was empty, created new."
                )

        except Exception as e:
            logger.error("Failed to initialize ChromaDB: %s", e)

    # ── public API ───────────────────────────────────────────
    def query(self, user_query: str, patient_id: int | None = None) -> dict:
        """
        1. Retrieve top-3 chunks from ChromaDB
        2. Format Llama 3 prompt
        3. Generate response
        """
        start = time.time()

        # 1. Retrieve context
        context, sources = self._retrieve(user_query)

        # 2. Build Llama 3 prompt
        prompt = self._format_prompt(user_query, context)

        # 3. Generate
        response_text = llm_service.generate(prompt)

        latency_ms = round((time.time() - start) * 1000)
        logger.info(
            "RAG query completed in %d ms  |  sources=%d",
            latency_ms,
            len(sources),
        )

        return {
            "response": response_text,
            "sources": sources,
            "context_used": context[:200] + "…" if context else None,
            "latency_ms": latency_ms,
        }

    # ── retrieval ────────────────────────────────────────────
    def _retrieve(self, query: str, n_results: int = 3):
        sources: list[dict] = []
        context = ""

        if self.collection is None or self.collection.count() == 0:
            return context, sources

        try:
            results = self.collection.query(
                query_texts=[query], n_results=n_results
            )

            if results["documents"] and results["documents"][0]:
                parts = []
                for i, text in enumerate(results["documents"][0]):
                    parts.append(f"[Source {i + 1}]: {text}")

                    distance = (
                        results["distances"][0][i]
                        if "distances" in results and results["distances"]
                        else 0.5
                    )
                    score = max(0.0, 1.0 - distance / 2.0)

                    sources.append(
                        {"content": text, "score": round(score, 4), "id": i + 1}
                    )

                context = "\n\n".join(parts)

        except Exception as e:
            logger.error("Retrieval failed: %s", e)

        return context, sources

    # ── Llama 3 prompt format ────────────────────────────────
    @staticmethod
    def _format_prompt(question: str, context: str) -> str:
        system_msg = (
            "You are MedGuardian, an AI medical assistant. "
            "Answer the user's question based ONLY on the provided context. "
            "If the context does not contain enough information, say so. "
            "Always check for drug interactions. Be concise and helpful."
        )

        # Official Llama 3 chat template
        prompt = (
            "<|begin_of_text|>"
            "<|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_msg}<|eot_id|>"
            "<|start_header_id|>user<|end_header_id|>\n\n"
            f"Context:\n{context}\n\n"
            f"Question: {question}<|eot_id|>"
            "<|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        return prompt


# Global instance
rag_assistant = RAGAssistant()
