import os
import sys
import fitz  # PyMuPDF for PDF parsing
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
from openai import OpenAI

# --- CONFIG ---
PDF_PATH = r"C:/Users/Nitro V/Downloads/javabook.pdf"
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL = "llama3:latest"   # assumes you have this model available via OpenAI-compatible API

# --- STEP 1: Load and split PDF ---
def load_pdf(path):
    doc = fitz.open(path)
    texts = []
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            texts.append(text)
    return texts

# --- STEP 2: Embed chunks ---
def embed_texts(texts, model):
    embeddings = model.encode(texts)
    return np.array(embeddings)

# --- STEP 3: Build FAISS index ---
def build_index(embeddings):
    dim = embeddings.shape[1]
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)
    return index

# --- STEP 4: Query RAG system ---
def rag_query(query, texts, embeddings, index, client):
    # Embed query
    q_emb = embeddings_model.encode([query])
    D, I = index.search(np.array(q_emb), k=3)
    retrieved = [texts[i] for i in I[0]]

    context = "\n\n".join(retrieved)
    prompt = f"Answer the question using the context below.\n\nContext:\n{context}\n\nQuestion: {query}\nAnswer:"

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )
    return response.choices[0].message.content

# --- MAIN ---
if __name__ == "__main__":
    print("Loading PDF...")
    texts = load_pdf(PDF_PATH)

    print("Embedding...")
    embeddings_model = SentenceTransformer(EMBED_MODEL)
    embeddings = embed_texts(texts, embeddings_model)

    print("Building FAISS index...")
    index = build_index(embeddings)

    print("Ready! Type your question:")
    client = OpenAI()

    while True:
        query = input("\n> ")
        if query.lower() in ["exit", "quit"]:
            sys.exit()
        answer = rag_query(query, texts, embeddings, index, client)
        print("\nAnswer:\n", answer)