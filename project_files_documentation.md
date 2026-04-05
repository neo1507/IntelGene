# Enterprise RAG System: Detailed File Documentation

This document serves as a comprehensive collection of READMEs for every significant file used in this project. It breaks down the intricate details of both the Python backend architecture and the vanilla HTML/CSS/JavaScript frontend. This guide is designed to help beginners easily understand the logic, libraries, embedding models, LLM models, and specific techniques deployed in our complete system.

---

## 🐍 Backend Architecture

### 1. `ingestion_pipeline.py`
**Purpose**: The data consumer. This script is responsible for reading your raw text files, splitting them into manageable chunks, converting the text into mathematical vectors, and saving them to a local database.

*   **Libraries Used**:
    *   `os`: For path and directory management.
    *   `langchain_community.document_loaders`: `DirectoryLoader`, `PyPDFDirectoryLoader`, and `TextLoader` are used to recursively scan and read `.txt` and `.pdf` files natively.
    *   `langchain_text_splitters`: `RecursiveCharacterTextSplitter` is used to split texts.
    *   `langchain_huggingface`: `HuggingFaceEmbeddings` acts as our embedding interface.
    *   `langchain_chroma`: `Chroma` interfaces with our specific vector database.
*   **Embedding Model**: `all-MiniLM-L6-v2` via HuggingFace. This model is exceptionally fast, operates purely on your local CPU (ensuring data privacy), and yields highly accurate vector representations.
*   **Techniques & Logic**:
    *   **Chunking**: The text is split into chunks of `1000` characters. Crucially, a `chunk_overlap` of `200` characters is used. This overlap ensures that context isn't accidentally destroyed if an important sentence falls right on a chunk boundary.
    *   **Vectorization & Persistence**: The chunks and the embedding model are passed into ChromaDB. Chroma turns the strings into vectors and saves the physical database file directly to the `./chroma_db` folder. 
*   **Important Code block**: The `main()` function handles the overarching pipeline layout. Specifically `text_splitter.split_documents(documents)` and `Chroma.from_documents(...)` apply the logic mechanically.

---

### 2. `retrieval_pipeline.py`
**Purpose**: The data fetcher. When a user asks a question, this script converts their question into a vector, queries the database, and returns the most relevant chunks of data.

*   **Libraries Used**: `langchain_huggingface` (`HuggingFaceEmbeddings`), `langchain_chroma` (`Chroma`), `langchain_community.retrievers` (`BM25Retriever`), and `langchain.retrievers` (`EnsembleRetriever`).
*   **Embedding Model**: Identical to ingestion (`all-MiniLM-L6-v2`) to ensure mathematically equivalent comparisons for the semantic queries.
*   **Techniques & Logic**:
    *   **Global Execution / Caching**: It utilizes global variables (`_vectorstore`, `_retriever`) inside `get_retriever()`. HuggingFace embedding models are large; by making them global, the script only loads the model *once*.
    *   **Hybrid Search / Ensemble Retrieval**: Instead of just using vector embeddings, it builds a `BM25Retriever` from the corpus, which implements exact-keyword document matching algorithms. The `EnsembleRetriever` combines the BM25 and Chroma results 50/50, fetching the top 5 chunks ensuring both semantic meaning and explicit keyword matches are returned.
    *   **Live Cache Refreshing**: A `refresh_retriever()` proxy method allows the `main.py` watchdog to purge the cache and natively recalculate the BM25 index on file changes.
*   **Important Code block**: The `retrieve_context(query)` function invokes the ensemble retriever directly on the user's query and returns the matching document chunks.

---

### 3. `generation_pipeline.py`
**Purpose**: The speaker. It takes the factual chunks provided by the retrieval pipeline, injects them alongside the user's question into a strict prompt, and sends it to a Large Language Model to formulate a human-readable answer.

*   **Libraries Used**:
    *   `os` & `dotenv`: To securely load and read the `GROQ_API_KEY` from the hidden `.env` file.
    *   `langchain_groq`: `ChatGroq` acts as the API interface to communicate with Groq servers.
    *   `langchain_core.prompts`: `PromptTemplate` builds string templates safely.
*   **LLM Model Used**: `llama-3.1-8b-instant`. We tap into Meta's highly capable 8-Billion parameter Llama 3 model run on Groq's high-speed "LPU" hardware for near-instant inference.
*   **Techniques & Logic**:
    *   **Semantic intent & Anti-Hallucination**: The `get_prompt_template()` function defines the core instructions. It pushes the AI to deduce the *meaning* of the inquiry and format it professionally utilizing Markdown heuristics (bolding, lists, and headers), rather than strictly copying excerpts textually without context. It rigidly commands the AI to answer *only* based on the provided context to ban hallucination.
    *   **Document Chains**: We use `create_stuff_documents_chain`, which is a LangChain pipeline designed explicitly to "stuff" all our retrieved document chunks neatly into the `context` variable of our prompt.
*   **Important Code block**: `generate_answer(query, retrieved_docs)` executes the network request to Groq (`chain.invoke(...)`) with the query and the exact docs retrieved from Chroma.

---

### 4. `main.py`
**Purpose**: The Grand Orchestrator and Web Server. It ties all three pipelines together and provides the network foundation for our user interface.

*   **Libraries Used**: 
    *   `fastapi`: `FastAPI` (the web framework) and `HTTPException` (handling network errors).
    *   `pydantic`: `BaseModel` (for strict data typing).
    *   `fastapi.middleware.cors`: Allows the frontend to talk to this backend.
    *   `fastapi.staticfiles`: Used to serve HTML files instead of just JSON.
    *   `watchdog`: Leveraged within a `lifespan` generator to monitor the filesystem as a background thread.
*   **Techniques & Logic**:
    *   **Background Syncing**: The `lifespan` method ties a `watchdog` process to start asynchronously right side-by-side with FastAPI. This `Observer` watches `enterprise_data`. On detecting changes, it programmatically triggers `ingestion_pipeline.main()` ensuring the RAG model continuously and seamlessly learns in real time.
    *   **RESTful APIs**: Defines distinct URLs (Endpoints). The `@app.post("/ingest")` endpoint is triggered to process knowledge. The `@app.post("/chat")` endpoint handles queries.
    *   **Type Hinting**: `QueryRequest` and `QueryResponse` establish strict schemas so the system knows exactly what data shape to accept and return.
    *   **Delegation/Separation of Concerns**: Notice how `main.py` does very little "AI" work directly. It imports `retrieval_pipeline`, asks it for docs, parses out the filename `sources` (metadata), and then sends the docs to `generation_pipeline`. 
    *   **Static Serving**: `app.mount("/", StaticFiles...)` seamlessly binds the `frontend` folder to the root URL of your localhost, completely erasing the need for a separate frontend server (like Node.js).
*   **Important Code block**: The `execute_rag(...)` function acts as the supreme control flow logically routing the user's query through the system from DB to LLM.

---

## 🎨 Web Frontend Architecture

### 5. `frontend/index.html`
**Purpose**: The structural backbone of the user interface. It defines *what* is on the screen without deciding *how* it looks or behaves.

*   **Techniques & Logic**:
    *   **Semantic Layout**: Divided cleanly into absolute elements utilizing `<aside class="sidebar">` and `<main class="chat-container">`.
    *   **Font Integration**: Links external stylesheets like Google's `Inter` font, mimicking a modern tech aesthetic, alongside Cloudflare `FontAwesome` for all of the icons visible (users, cubes, rotate symbols).
*   **Important Parts**: The `<input id="user-input">` and `<button id="send-btn">` are the prime connection points. These HTML IDs represent the exact hooks JavaScript will target to capture user intent.

---

### 6. `frontend/style.css`
**Purpose**: The paintbrush. It contains instructions defining the dark mode aesthetics, spatial layouts, shadows, and animations.

*   **Techniques & Logic**:
    *   **CSS Variables**: Defined in the `:root` pseudo-class (ex. `--bg-main: #343541`), serving as a central palette registry to keep colors perfectly consistent.
    *   **Flex-box Layout**: Extensive use of `display: flex;` allowing absolute containment (ensuring the scroll bar is only attached to the text area rather than the entire page).
    *   **Micro-Animations**: Uses `@keyframes`. For instance, the `bounce` animation physically scales and shifts the opacity of three tiny `<span>` dots to mimic someone actively typing. The `spin` animation rotates the sync icon during loading.
    *   **Glassmorphism**: The input footer (`.glass-footer`) utilizes linear `rgba()` gradients which fade transparency into the background so scrolling text vanishes elegantly beneath the input bar.

---

### 7. `frontend/script.js`
**Purpose**: The engine of the UI. It runs as Javascript in the browser, allowing for asynchronous communication with the python server and dynamically manipulating the screen without page reloads.

*   **Techniques & Logic**:
    *   **Asynchronous Network Fetch**: Instead of using old `XMLHttpRequests`, it uses ES6 `async / await fetch()` promises. When `fetch('http://localhost:8000/chat', ...)` runs, the javascript waits patiently for python to respond. 
    *   **Dynamic DOM Manipulation**: Inside `appendMessage()`, instead of hardcoding HTML into `index.html`, Javascript dynamically builds custom strings of HTML (`msgDiv.innerHTML = ...`) and forcefully injects them straight into the chat box using `appendChild()`.
    *   **Typewriter Simulation**: The `typeText(...)` module uses mathematical recursion via `setTimeout()`. Instead of plopping down the entire LLM response instantly, it loops over the text and renders one character at a time every 15 milliseconds, generating the hyper-realistic visual illusion of an AI actively thinking and streaming a reply.
*   **Important Code block**: `sendMessage()` manages the entire lifecycle of an interaction: It clears the input form, renders the user's bubble, renders a bouncing loading indicator, waits over the network for the RAG orchestrator, deletes the loading indicator, and begins the typewriter animation of the LLM's answer while finally mounting the source file metadata badges below it.
