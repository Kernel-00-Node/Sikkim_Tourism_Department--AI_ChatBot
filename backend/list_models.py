"""
|| Utility Script || — lists every Gemini model available to your API key.

Run with: python list_models.py

Useful for confirming the exact embedding dimension, model names available
before setting GEMINI_MODEL & GEMINI_EMBEDDING_MODEL in `.env.`
"""

from dotenv import load_dotenv
from google import genai
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

for model in client.models.list():
    print(model.name)
    
# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────────────────────────    