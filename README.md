# Enterprise RAG Orchestration System

Welcome! If you're a curious learner checking out how this Retrieval-Augmented Generation (RAG) system works, this guide is explicitly for you. We have restructured the engine into a highly scalable, isolated "Separation of Concerns" architecture using a central Orchestrator. 

---

## 🏛️ The Separation of Concerns (Architecture)

Instead of dumping all of the logic into a single massive file, we've cleanly sliced the system into **three distinct pipelines**, all managed dynamically by **one grand Orchestrator (`main.py`)**.

This is how modern scaling engineering works in practice.

### 1️⃣ Data Ingestion (`ingestion_pipeline.py`)

This standalone pipeline is entirely dedicated to eating data and mathematically translating it locally so it remains private.
* **DirectoryLoader & TextSplitter:** We scan `enterprise_data/` for `.txt` and `.pdf` files. PDFs are automatically parsed by `PyPDFDirectoryLoader`. We chop massive documents into strict `1000` character "chunks" (with a `200` overlap so we don't accidentally split critical sentences in half).
* **HuggingFace & ChromaDB:** We use a local CPU embedding model (`all-MiniLM-L6-v2`) to turn chunks into coordinate vectors, saving them to the `chroma_db` folder permanently.

### 2️⃣ Specialized Context Retrieval (`retrieval_pipeline.py`)

This strict, tiny pipeline has ONE job: talking to ChromaDB via Hybrid Search.
* **Hybrid Retriever (Ensemble):** It combines a traditional Vector Semantic search over `all-MiniLM-L6-v2` with an exact-keyword `BM25` algorithm index for hyper-accurate matches. It filters the database for the top 5 most relevant textual facts that directly relate to the query.

### 3️⃣ Pure Intelligence Generation (`generation_pipeline.py`)

This pipeline handles interacting with the Large Language Model over the network.
* **Groq API & Llama 3:** We connect to Groq's high-speed "LPU" hardware to run Meta's massive `llama3-8b-8192` model natively in real-time.
* **Anti-Hallucination Prompting:** Before we send the question, we inject the 3 facts gathered by the Retrieval pipeline right into a strict Prompt. We force Llama 3 to act as an "open-book test" taker—if it doesn't see the answer specifically in those 3 facts, it is restricted from inventing an answer.

---

## 🧠 The Orchestrator (`main.py`)

`main.py` is the grand conductor holding the baton. It acts as our **FastAPI Web Server** and features a background event watcher (`watchdog`).

### The Pathways & Automated Sync:
* **Background Data Sync:** Every time you modify or drop inside `enterprise_data/`, a Python `watchdog` process automatically triggers the ingestion pipeline behind the scenes, permanently bypassing the need for manual restarts or `/ingest` triggers under normal circumstances.
* **The `/ingest` Endpoint:** You can hit `http://localhost:8000/ingest` and the Orchestrator will seamlessly trigger `ingestion_pipeline.py` entirely programmatically rather than making you use a terminal command.
* **The `/chat` Endpoint:** When a user asks a question, the Orchestrator executes three flawless delegations:
    1. *"Algorithm: Send this question down to `retrieval_pipeline.py` and get the top 3 facts."*
    2. *"Algorithm: Ensure we save the file sources of these facts so the Frontend knows where they came from."*
    3. *"Algorithm: Pass those 3 facts to `generation_pipeline.py` and get me an answer from Llama 3."*
    4. The Orchestrator collects the final answer and serves it via JSON straight to your screen.

---

## 🚀 Running the System

1. Add your `.txt` or `.pdf` files to `enterprise_data/`. (You can add more later and they will auto-sync!)
2. Grab your free fast API Key from [console.groq.com](https://console.groq.com) and paste it into the `.env` file!
3. Start the entire Orchestrator stack by running:
   ```bash
   uvicorn main:app --reload
   ```
4. As soon as you see "Application startup complete.", your web endpoints and private intelligence engines are officially online!
