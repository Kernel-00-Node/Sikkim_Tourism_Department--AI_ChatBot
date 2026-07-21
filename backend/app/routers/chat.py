"""
Chat router — manages conversations and SSE-streamed AI responses.

Now powered by LangChain + Qdrant RAG (see app/services/rag_chain.py).
The SSE API contract is unchanged — the frontend works without any modification.

SSE endpoint: POST /api/conversations/{id}/chat
The client reads chunks with EventSource or fetch + ReadableStream.
"""
from __future__ import annotations

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from app.database.base import BaseRepository
from app.database.factory import get_repo
from app.models.schemas import ChatRequest, ConversationResponse, Message
from app.services.rag_chain import stream_rag_response

logger = logging.getLogger(__name__)

router = APIRouter()


def _messages_to_history(messages: list[Message]) -> list[dict]:
    """
    Convert stored Message objects into the simple dict format
    expected by the RAG chain (excludes the very last message,
    which is the current user turn being processed now).
    """
    return [
        {"role": m.role, "content": m.content}
        for m in messages[:-1]
    ]


@router.post("/", response_model=ConversationResponse)
async def create_conversation(repo: BaseRepository = Depends(get_repo)):
    conv = await repo.create_conversation()
    return ConversationResponse(conversation=conv, messages=[])


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    repo: BaseRepository = Depends(get_repo),
):
    conv = await repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = await repo.list_messages(conversation_id)
    return ConversationResponse(conversation=conv, messages=messages)


@router.post("/{conversation_id}/chat")
async def send_message(
    conversation_id: str,
    body: ChatRequest,
    repo: BaseRepository = Depends(get_repo),
):
    conv = await repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # 1. Persist user message
    await repo.add_message(conversation_id, "user", body.message)

    # 2. Build conversation history (all messages before this one)
    all_messages = await repo.list_messages(conversation_id)
    history = _messages_to_history(all_messages)

    # 3. Stream RAG-grounded Gemini response via SSE
    assistant_chunks: list[str] = []

    async def event_generator():
        nonlocal assistant_chunks
        try:
            async for chunk in stream_rag_response(body.message, history):
                assistant_chunks.append(chunk)
                # SSE format: "data: <json>\n\n"
                yield f"data: {json.dumps({'text': chunk})}\n\n"
        except Exception as exc:
            logger.exception("SSE stream error: %s", exc)
            # The frontend only ever reads `data.text` chunks and silently
            # console.errors `data.error` (it never renders it), so an
            # error-only payload left the user staring at the "typing" dots
            # forever with no feedback. Send a normal, human-readable text
            # chunk instead so the existing (unmodified) frontend renders it
            # in the chat bubble like any other reply.
            friendly = (
                "Sorry, I ran into a problem answering that just now. "
                "Please try again in a moment."
            )
            assistant_chunks.append(friendly)
            yield f"data: {json.dumps({'text': friendly, 'error': str(exc)})}\n\n"
        finally:
            # Persist the complete assistant reply after streaming finishes
            full_response = "".join(assistant_chunks)
            if full_response:
                await repo.add_message(conversation_id, "assistant", full_response)
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
