"""
|| App_Configuration || — reads from .env (or Environment_Variables).
No Hardcoding Credentials within this File ...
"""

from pydantic_settings import BaseSettings, SettingsConfigDict

# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ── Globally_Accessibile_Object_Instantiation ──────────────────────────────────────────────────────────

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Database_Mode ──────────────────────────────────────────────────────────
    use_mock_db: bool = True

    # ── MySQL (used only when use_mock_db: bool = False) ───────────────────────────────
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "sikkim_tourism"

    # ── Gemini_AI ──────────────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    
    # ── Groq_AI ──────────────────────────────────────────────────────────────
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # ── Embedding_Model ──────────────────────────────────────────────────────────────
    gemini_embedding_model: str = "models/text-embedding-004"

    # ── Qdrant_Vector_Store ────────────────────────────────────────────────────
    qdrant_url: str = ""
    qdrant_api_key: str = ""          # Only Needed for Qdrant Cloud
    qdrant_collection: str = "sikkim_destinations"

    # ── CORS ───────────────────────────────────────────────────────────────────
    allowed_origins: str = "*"

    # ── Derived_Helpers ────────────────────────────────────────────────────────
    @property
    def db_mode(self) -> str:
        return "mock" if self.use_mock_db else "mysql"

    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins == "*":
            return ["*"]
        return [o.strip() for o in self.allowed_origins.split()]

    @property
    def qdrant_mode(self) -> str:
        return "remote" if self.qdrant_url else "in-memory"
# ──────────────────────────────────────────────────────────────────────────────────────────────────

# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ── Object_Instantiation_Initialied_From_Here ────────────────────────────────────────────────────────
settings = Settings()

# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────────────────────────
# ──────────────────────────────────────────────────────────────────────────────────────────────────
