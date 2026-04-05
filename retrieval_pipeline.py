import os
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.documents import Document

# Global initialization prevents reloading the massive embedding model on every single API request.
_vectorstore = None
_retriever = None

def refresh_retriever():
    global _retriever, _vectorstore
    _retriever = None
    _vectorstore = None
    print("Retrieval Pipeline: Cache cleared. Will re-initialize on next query.")

def get_retriever():
    global _vectorstore, _retriever
    if _retriever is None:
        print("Initializing Hybrid Retrieval Pipeline (ChromaDB + BM25)...")
        persist_directory = "./chroma_db"
        
        # We enforce local CPU embeddings
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        # Load the DB
        _vectorstore = Chroma(persist_directory=persist_directory, embedding_function=embeddings)
        
        # 1. Semantic Retriever (Dense)
        chroma_retriever = _vectorstore.as_retriever(search_type="mmr", search_kwargs={"k": 5, "fetch_k": 20})
        
        # 2. Keyword Retriever (Sparse BM25)
        print("Retrieval Pipeline: Pulling documents from Chroma to build BM25 keyword index...")
        all_data = _vectorstore.get(include=["documents", "metadatas"])
        
        if all_data and all_data["documents"]:
            docs = [
                Document(page_content=doc, metadata=meta or {}) 
                for doc, meta in zip(all_data["documents"], all_data["metadatas"])
            ]
            bm25_retriever = BM25Retriever.from_documents(docs)
            bm25_retriever.k = 5
            
            # Combine them 50/50
            _retriever = EnsembleRetriever(
                retrievers=[bm25_retriever, chroma_retriever], 
                weights=[0.5, 0.5]
            )
        else:
            # Fallback if DB is completely empty somehow
            _retriever = chroma_retriever
            
    return _retriever

def retrieve_context(query: str):
    """
    Takes a string query, converts it to an embedded vector internally,
    searches the ChromaDB, and returns the top matched document chunks.
    """
    retriever = get_retriever()
    docs = retriever.invoke(query)
    print(f"Retrieval Pipeline: Successfully pulled {len(docs)} chunks of context.")
    return docs
