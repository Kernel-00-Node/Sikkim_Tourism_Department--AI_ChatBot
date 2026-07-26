"""
|| App_Configuration || — reads from .env (or Environment_Variables).
No Hardcoding Credentials within this File ...
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

# ─────────────────────────────────────────────────────────────────
# ── Globally_Accessibile_Object_Instantiation ────────────────────────────────────────────────

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Database_Mode ────────────────────────────────────────────────────────
    use_mock_db: bool = True

    # ── MySQL (used only when use_mock_db: bool = False) ───────────────────────────────
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "sikkim_tourism"

    # ── Gemini_AI ─────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"

    # ── Groq_AI ──────────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # ── Tavily_Web_Search_(Hybrid_RAG) ──────────────────────────────────────
    tavily_api_key: str = ""

    # ── Embedding_Model ───────────────────────────────────────────────────────
    # NOTE: "text-embedding-004" was retired by Google in late 2025. Use
    # "models/gemini-embedding-001" (3072-dim by default). vectorstore.py
    # detects the real output dimension at runtime, so this can be changed
    # freely without touching any other file.
    gemini_embedding_model: str = "models/gemini-embedding-001"

    # ── Qdrant_Vector_Store ────────────────────────────────────────────────────
    qdrant_url: str = ""
    qdrant_api_key: str = ""  # Only Needed for Qdrant Cloud
    qdrant_collection: str = "sikkim_destinations"

    # ── CORS (security-hardened defaults) ───────────────────────────────────
    allowed_origins: str = "http://localhost:5173"  # FIXED: Explicit default for dev
    allowed_methods: str = "GET,POST,OPTIONS"  # FIXED: Only necessary methods
    allowed_headers: str = "Content-Type,Authorization"  # FIXED: Restrict headers

    # ── Environment ───────────────────────────────────────────────────────────
    environment: str = "development"  # 'development' or 'production'

    # ── Derived_Helpers ───────────────────────────────────────────────────────
    @property
    def db_mode(self) -> str:
        return "mock" if self.use_mock_db else "mysql"

    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins == "*":
            import logging

            logging.warning(
                "⚠️  CORS is set to '*' — this is INSECURE for production!"
            )
        return [
            o.strip()
            for o in self.allowed_origins.split(",")
            if o.strip()
        ]

    @property
    def methods_list(self) -> list[str]:
        return [
            m.strip()
            for m in self.allowed_methods.split(",")
            if m.strip()
        ]

    @property
    def headers_list(self) -> list[str]:
        return [
            h.strip()
            for h in self.allowed_headers.split(",")
            if h.strip()
        ]

    @property
    def qdrant_mode(self) -> str:
        return "remote" if self.qdrant_url else "in-memory"


# ────────────────────────────────────────────────────────────────
# ── Object_Instantiation_Initialied_From_Here ────────────────────────────────────────────────
settings = Settings()

# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────
