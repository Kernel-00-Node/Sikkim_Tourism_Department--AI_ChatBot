"""
Chat router — manages conversations and SSE-streamed AI responses.

Now powered by LangChain + Qdrant RAG (see app/services/rag_chain.py).

SSE endpoint: POST /api/conversations/{id}/chat
The client reads chunks with EventSource or fetch + ReadableStream.
Each event is `data: <json>\\n\\n`:
  - {"text": "..."}        — a chunk of the assistant's streamed reply
  - {"suggestions": [...]} — up to 3 follow-up-question chips, sent once
                             right after the reply finishes (best-effort;
                             may be omitted entirely if generation fails)
  - "[DONE]"                — end of stream

Vision path (image attached):
  When the request body contains image_base64 + image_mime_type the turn is
  routed through stream_rag_response_with_image (Gemini Vision) instead of
  the default text-only Groq chain.
"""
from __future__ import annotations

import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.base import BaseRepository
from app.database.factory import get_repo
from app.models.schemas import ChatRequest, ConversationResponse, Message
from app.services.rag_chain import (
    stream_rag_response,
    stream_rag_response_with_image,
    generate_followups,
)

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


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


def _is_valid_uuid(val: str) -> bool:
    """Validate UUID format."""
    try:
        UUID(val)
        return True
    except (ValueError, AttributeError):
        return False


@router.post("", response_model=ConversationResponse)
async def create_conversation(repo: BaseRepository = Depends(get_repo)):
    conv = await repo.create_conversation()
    return ConversationResponse(conversation=conv, messages=[])


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
        conversation_id: str,
        repo: BaseRepository = Depends(get_repo),
):
    if not _is_valid_uuid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format.")

    conv = await repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    messages = await repo.list_messages(conversation_id)
    return ConversationResponse(conversation=conv, messages=messages)


@router.post("/{conversation_id}/chat")
@limiter.limit("30/minute")  # Rate limit: 30 requests per minute per IP
async def send_message(
        conversation_id: str,
        body: ChatRequest,
        request: Request,
        repo: BaseRepository = Depends(get_repo),
):
    if not _is_valid_uuid(conversation_id):
        raise HTTPException(status_code=400, detail="Invalid conversation ID format.")

    conv = await repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Determine whether this is a vision turn.
    has_image = bool(
        body.image_base64
        and body.image_mime_type
        and len(body.image_base64) > 0
    )

    # 1. Persist user message (store text only — never persist raw image data).
    await repo.add_message(conversation_id, "user", body.message)

    # 2. Build conversation history (all messages before this one)
    all_messages = await repo.list_messages(conversation_id)
    history = _messages_to_history(all_messages)

    # 3. Stream the AI response via SSE.
    assistant_chunks: list[str] = []

    async def event_generator():
        nonlocal assistant_chunks
        try:
            if has_image:
                # Vision path — Gemini 1.5 Flash multimodal
                stream = stream_rag_response_with_image(
                    user_message=body.message,
                    history_messages=history,
                    image_base64=body.image_base64,       # type: ignore[arg-type]
                    image_mime_type=body.image_mime_type, # type: ignore[arg-type]
                )
            else:
                # Text path — Groq / Llama
                stream = stream_rag_response(body.message, history)

            async for chunk in stream:
                assistant_chunks.append(chunk)
                yield f"data: {json.dumps({'text': chunk})}\n\n"

        except Exception as exc:
            logger.exception("SSE stream error: %s", exc)
            friendly = (
                "Sorry, I ran into a problem answering that just now. "
                "Please try again in a moment."
            )
            assistant_chunks.clear()
            assistant_chunks.append(friendly)
            yield f"data: {json.dumps({'text': friendly})}\n\n"
        finally:
            full_response = "".join(assistant_chunks)
            if full_response:
                await repo.add_message(conversation_id, "assistant", full_response)
                # Best-effort follow-up chips — never raises, never blocks.
                suggestions = await generate_followups(body.message, full_response)
                if suggestions:
                    yield f"data: {json.dumps({'suggestions': suggestions})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
