import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

load_dotenv()
_llm = None
_prompt = None

def get_llm():
    global _llm
    if _llm is None:
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key or groq_api_key == "your-groq-api-key-here":
            raise ValueError("GROQ API key is completely missing. Please add it to your .env file.")
        
        _llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.0,
            api_key=groq_api_key
        )
    return _llm

def get_prompt_template():
    global _prompt
    if _prompt is None:
        system_prompt = (
            "You are a helpful and friendly AI assistant for this knowledge base. 🧠\n\n"
            "Answer the user's question using only the provided context.\n\n"
            "Rules:\n"
            "- Be concise. Match response length to question complexity. ⚖️\n"
            "- For simple questions, reply in plain prose — no unnecessary formatting. 📝\n"
            "- Use markdown (headers, bullet points) only when the answer is complex or multi-part. 🏗️\n"
            "- Incorporate relevant emojis naturally throughout your response to make it engaging and accessible, just like ChatGPT. ✨\n"
            "- If the context does not contain the answer, say: \"I don't have that information in my knowledge base. ❌\"\n"
            "- Never fabricate facts outside the provided context. 🛑\n\n"
            "Context:\n{context}"
        )
        _prompt = PromptTemplate.from_template(
            template=system_prompt + "\n\nQuestion: {input}\nAnswer:"
        )
    return _prompt

def generate_answer(query: str, retrieved_docs: list) -> str:
    """
    Accepts the physical chunks retrieved from the DB, alongside the user's question,
    formats them into a LangChain prompt, and forwards them to Groq for generation.
    Returns the string text answer.
    """
    llm = get_llm()
    prompt = get_prompt_template()
    
    chain = create_stuff_documents_chain(llm, prompt)
    
    print(f"Generation Pipeline: Formatting prompt with {len(retrieved_docs)} chunks...")
    response_text = chain.invoke({"input": query, "context": retrieved_docs})
    print("Generation Pipeline: Groq LLM has successfully rendered an answer.")
    
    return response_text
