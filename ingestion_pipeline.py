import os
from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

def main():
    # 1. Define paths
    data_dir = "./enterprise_data"
    persist_directory = "./chroma_db"

    # Check if data directory exists, if not, create it and log a message
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"Created directory '{data_dir}'. Please place your .txt files there and re-run.")
        return

    # 2. Load Documents
    print(f"Loading documents from {data_dir}...")
    # We use glob='**/*.txt' to find all text files recursively. We use TextLoader for reading.
    print("Loading text files...")
    txt_loader = DirectoryLoader(data_dir, glob="**/*.txt", loader_cls=TextLoader, loader_kwargs={'encoding': 'utf-8'}, show_progress=True)
    txt_documents = txt_loader.load()
    
    print("Loading PDF files...")
    pdf_loader = PyPDFDirectoryLoader(data_dir)
    pdf_documents = pdf_loader.load()
    
    documents = txt_documents + pdf_documents

    if not documents:
        print(f"No documents (.txt or .pdf) found in '{data_dir}'. Please add some documents and re-run.")
        return

    print(f"Loaded {len(documents)} document(s).")

    # 3. Split Documents
    # We split large documents into smaller chunks (e.g. 1000 characters) to optimize retrieval.
    # Chunk overlap ensures context isn't lost at the boundary of chunks.
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
        is_separator_regex=False,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunk(s).")

    # 4. Initialize Embedding Model
    # Using a free, fully local embedding model from HuggingFace.
    # all-MiniLM-L6-v2 is extremely fast and effective for general similarity search.
    print("Initializing HuggingFace embedding model (this may take a moment to download on first run)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 5. Create and persist Vector Store
    print(f"Creating vector store and persisting to {persist_directory}...")
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    print("Ingestion Pipeline Complete! Data is ready for retrieval.")

if __name__ == "__main__":
    main()
