"""
LangChain RAG chain for the Sikkim Tourism Assistant.
Pure LCEL — works with LangChain 0.2+ and 0.3+.
"""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from functools import lru_cache

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_groq import ChatGroq

from app.config import settings
from app.services.vectorstore import get_vectorstore

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are the Sikkim Tourism Assistant, the official virtual guide of the Tourism and Civil "
    "Aviation Department, Government of Sikkim. Speak in first person as this assistant — never "
    "say you are a generic AI or language model.\n\n"
    

    # FIX 1 & 2: explicit scope rules — replaces the old "Use ONLY retrieved info" restriction
    "SCOPE — what you answer:\n"
    "You may answer ANY question that is about Sikkim or is directly relevant to visiting Sikkim — "
    "destinations, permits, entry fees, best times to visit, how to reach places, accommodation, "
    "local food, cuisine, culture, history, geography, weather, festivals, wildlife, trekking, "
    "safety tips, travel advice, transport, and anything else a tourist planning a trip to Sikkim "
    "would need to know.\n\n"

    "SCOPE — what you do NOT answer:\n"
    "If a question has nothing to do with Sikkim or travel/tourism in general "
    "(for example: physics, mathematics, general science, coding, politics unrelated to Sikkim, "
    "or any other off-topic subject), politely decline and redirect. Say something like: "
    "'I am the Sikkim Tourism Assistant and can only help with questions about Sikkim and your "
    "trip here. Is there something about Sikkim I can help you with?'\n\n"

    "ANSWERING:\n"
    "Be friendly, warm, and locally knowledgeable, as if you work for the Department and are "
    "personally explaining Sikkim to a visitor. Mention permits clearly when required. "
    "Keep responses concise but complete. Use bullet points for lists. "
    "Do not make up facts. Do not use emojis.\n\n"

    "Use the following retrieved context to ground your answer where relevant. "
    "If the context is empty or does not cover the question but the question is still about Sikkim, "
    "answer from your general knowledge about Sikkim. "
    "If you genuinely do not know, say so honestly.\n\n"

    "--- CONTEXT ---\n"
    "{context}\n"
    "--- END CONTEXT ---"
)

_REPHRASE_SYSTEM = (
    "Given the conversation history and the latest user question, "
    "rewrite the question as a fully self-contained search query "
    "(keep it short; include key place/topic names). "
    "Do NOT answer — only rewrite. "
    "If it is already self-contained, return it unchanged."
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_chat_history(raw_messages: list[dict]) -> list:
    msgs = []
    for m in raw_messages:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        else:
            msgs.append(AIMessage(content=m["content"]))
    return msgs


# FIX 6: lowered temperature from 0.7 → 0.3 for more factual, consistent answers
@lru_cache(maxsize=2)
def _get_llm(streaming: bool = True) -> ChatGroq:
    return ChatGroq(
        model=settings.groq_model,
        api_key=settings.groq_api_key,
        temperature=0.3,
        max_tokens=1024,
        streaming=streaming,
    )

async def _contextualise_question(inputs: dict) -> str:
    chat_history = inputs.get("chat_history", [])
    question = inputs["input"]
    if not chat_history:
        return question
    rephrase_prompt = ChatPromptTemplate.from_messages([
        ("system", _REPHRASE_SYSTEM),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    chain = rephrase_prompt | _get_llm(streaming=False) | StrOutputParser()
    # FIX 5: was "network round-trip to Gemini" — corrected to Groq
    # Use ainvoke so this doesn't block the FastAPI event loop during the
    # network round-trip to Groq.
    return await chain.ainvoke({"input": question, "chat_history": chat_history})


async def _retrieve_context(standalone_question: str) -> str:
    try:
        vs = get_vectorstore()
        retriever = vs.as_retriever(search_type="similarity", search_kwargs={"k": 4})
        # Async retrieval — the previous sync `.invoke()` blocked the whole
        # FastAPI event loop for the duration of the Qdrant + embedding call.
        docs = await retriever.ainvoke(standalone_question)
        return "\n\n".join(doc.page_content for doc in docs) if docs else ""
    except Exception as exc:
        logger.warning("Qdrant retrieval failed (empty context): %s", exc)
        return ""


# FIX 3: merges injected extra_context (e.g. full destinations list) with RAG results
async def _retrieve_context_step(inputs: dict) -> str:
    rag = await _retrieve_context(inputs["standalone_question"])
    extra = inputs.get("extra_context", "")
    if extra and rag:
        return f"{extra}\n\n{rag}"
    return extra or rag


def _build_chain():
    answer_prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM_PROMPT),
        MessagesPlaceholder("chat_history"),
        ("human", "{input}"),
    ])
    return (
            RunnablePassthrough.assign(
                standalone_question=RunnableLambda(_contextualise_question),
            )
            | RunnablePassthrough.assign(
        context=RunnableLambda(_retrieve_context_step),
    )
            | answer_prompt
            | _get_llm(streaming=True)
            | StrOutputParser()
    )

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

# FIX 4: added extra_context parameter so the chat router can inject the
# full destinations list for broad listing queries
async def stream_rag_response(
        user_message: str,
        history_messages: list[dict],
        extra_context: str = "",
) -> AsyncGenerator[str, None]:
    if not settings.groq_api_key:
        yield "GROQ_API_KEY is not configured. Add it to your .env file and restart."
        return

    chat_history = _build_chat_history(history_messages)
    chain = _build_chain()

    try:
        async for chunk in chain.astream(
                {"input": user_message, "chat_history": chat_history, "extra_context": extra_context}
        ):
            if chunk:
                yield chunk
    except Exception as exc:
        logger.exception("RAG chain error: %s", exc)
        # FIX 7: was yielding raw Python exception string to the user.
        # Now yields a friendly message instead.
        yield (
            "I'm sorry, I ran into a problem processing your request. "
            "Please try again in a moment."
        )