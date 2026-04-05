from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
import shutil
from fastapi.middleware.cors import CORSMiddleware
import os
from contextlib import asynccontextmanager
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler


import ingestion_pipeline
import retrieval_pipeline
import generation_pipeline

class IngestionHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if not event.is_directory:
            print(f"Orchestrator: Document sync triggered by: {event.src_path}")
            try:
                ingestion_pipeline.main()
                retrieval_pipeline.refresh_retriever()
            except Exception as e:
                print(f"Orchestrator: Auto-sync encountered an error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):

    print("Orchestrator: Starting background Watchdog for './enterprise_data'...")
    data_dir = "./enterprise_data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    event_handler = IngestionHandler()
    observer = Observer()
    observer.schedule(event_handler, data_dir, recursive=False)
    observer.start()
    
    yield
    

    print("Orchestrator: Shutting down background Watchdog...")
    observer.stop()
    observer.join()

app = FastAPI(title="Enterprise RAG Orchestrator API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    sources: list[str]

@app.post("/ingest")
def trigger_ingestion():
    """
    Dynamically trigger the Ingestion mechanism avoiding the terminal entirely.
    """
    try:
        print("Orchestrator: Executing Data Ingestion...")
        ingestion_pipeline.main()
        return {"status": "success", "message": "Enterprise documents successfully ingested and vectorized into ChromaDB."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=QueryResponse)
def execute_rag(request: QueryRequest):
    """
    The orchestrator receives the question, delegates to the retrieval pipeline,
    and forwards results to the generation pipeline securely.
    """
    try:
        # Step 1. Tell Retrieval Pipeline to fetch the highest concentrated chunks
        print(f"Orchestrator: Asking Retrieval Pipeline to query database for: {request.question}")
        docs = retrieval_pipeline.retrieve_context(request.question)
        
        # Step 2. Collate Metadata Sources so the user knows where the answer came from
        sources = []
        for doc in docs:
            src = doc.metadata.get("source", "Unknown Data Source")
            if src not in sources:
                sources.append(src)
                
        # Step 3. Tell Generation Pipeline to take our facts and speak natively
        print("Orchestrator: Sending context and query to Generation Pipeline...")
        answer = generation_pipeline.generate_answer(request.question, docs)
        
        print("Orchestrator: Success! Returning payload to Front End.")
        return QueryResponse(answer=answer, sources=sources)
    
    except ValueError as ve:

        raise HTTPException(status_code=500, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal Orchestration Error: " + str(e))

ALLOWED_EXTENSIONS = {".txt", ".pdf"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accept a .txt or .pdf file from the frontend, save it to enterprise_data/.
    Watchdog will automatically detect the new file and trigger ingestion.
    """
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Only .txt and .pdf files are allowed."
        )

    data_dir = "./enterprise_data"
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    dest_path = os.path.join(data_dir, file.filename)
    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        print(f"Orchestrator: Uploaded '{file.filename}' → '{dest_path}'. Watchdog will auto-ingest.")
        return {
            "status": "success",
            "message": f"'{file.filename}' uploaded successfully! Watchdog is now vectorizing it automatically. 🚀"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


from fastapi.staticfiles import StaticFiles

app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
