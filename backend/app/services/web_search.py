"""
Web search service — Tavily, scoped to Sikkim tourism only.

This is the second half of the "hybrid" RAG setup: the vector store
(vectorstore.py) answers from your own curated destinations database,
this module answers from the live internet — but only for things
relevant to Sikkim tourism.

Scoping strategy (defence in depth — two layers, not one):
  1. Every query sent to Tavily has ", Sikkim tourism" appended, which
     steers Tavily's own ranking toward Sikkim-relevant pages.
  2. The system prompt in rag_chain.py already instructs the LLM to
     decline anything unrelated to Sikkim, so even if a stray
     off-topic result slips through, the model won't use it to
     answer an off-topic question.
"""
from __future__ import annotations

import asyncio
import logging
from functools import lru_cache

from tavily import TavilyClient

from app.config import settings

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_tavily_client() -> TavilyClient:
    return TavilyClient(api_key=settings.tavily_api_key)


def _search_sync(query: str, max_results: int) -> list[dict]:
    client = get_tavily_client()
    # Tavily rejects queries over 400 characters. Our standalone_question can
    # occasionally run long (it's an LLM-rewritten, context-expanded question),
    # so truncate defensively rather than let the whole search silently fail.
    suffix = ", Sikkim tourism"
    max_query_len = 400 - len(suffix)
    safe_query = query[:max_query_len].rstrip()
    # search_depth="basic" is faster and cheaper (1 credit/call) than
    # "advanced" (2 credits/call) — fine for short factual lookups like
    # this bot needs (opening hours, current weather, recent events).
    response = client.search(
        query=f"{safe_query}{suffix}",
        max_results=max_results,
        search_depth="basic",
    )
    return response.get("results", [])


async def search_sikkim_web(query: str, max_results: int = 3) -> str:
    """
    Search the web for up-to-date Sikkim tourism info and return it as a
    single text block ready to drop into the RAG context.

    Returns "" (not an exception) on any failure — a web search outage
    should degrade the bot to "database only," never crash the chat.
    """
    if not settings.tavily_api_key:
        logger.warning("TAVILY_API_KEY not set — skipping web search.")
        return ""

    try:
        results = await asyncio.to_thread(_search_sync, query, max_results)
    except Exception as exc:
        logger.warning("Tavily web search failed (continuing without it): %s", exc)
        return ""

    if not results:
        logger.info("Tavily web search returned 0 results for: %s", query)
        return ""

    logger.info("Tavily web search OK — %d result(s) for: %s", len(results), query)

    blocks = []
    for r in results:
        title = r.get("title", "")
        content = r.get("content", "")
        blocks.append(f"[Web] {title}: {content}")
    return "\n\n".join(blocks)
