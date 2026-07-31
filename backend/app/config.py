"""
|| App_Configuration || — reads from .env (or Environment_Variables).
No Hardcoding Credentials within this File ...
"""

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Storage
    use_mock_db: bool = True

    # MySQL (used only when use_mock_db is false)
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "sikkim_tourism"

    # AI providers
    gemini_api_key: str = ""
    # Pin vision to a stable model so deployments behave predictably.
    gemini_model: str = "gemini-2.5-flash"

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # NOTE: "text-embedding-004" was retired by Google in late 2025. Use
    # "models/gemini-embedding-001" (3072-dim by default). vectorstore.py
    # detects the real output dimension at runtime, so this can be changed
    # freely without touching any other file.
    gemini_embedding_model: str = "models/gemini-embedding-001"


    # ── Tavily_Web_Search (live/real-time info: weather, festivals, permit
    # updates, road/landslide status, prices, "is X open today", etc.)
    # Leave empty to disable — chatbot silently falls back to RAG-only answers.
    tavily_api_key: str = ""

    # Generating three suggestion chips requires an additional LLM request
    # after every answer. Keep it opt-in so it cannot delay normal chat turns.
    enable_followups: bool = False

    # Vector store
    qdrant_url: str = ""
    qdrant_api_key: str = ""  # Only Needed for Qdrant Cloud
    qdrant_collection: str = "sikkim_destinations"

    # Browser access
    allowed_origins: str = "http://localhost:5173"
    allowed_methods: str = "GET,POST,OPTIONS"
    allowed_headers: str = "Content-Type,Authorization,X-Admin-Key"

    # Admin access
    # Required to call POST /api/admin/sync. Left empty by default so the
    # endpoint FAILS CLOSED (rejects every request) until an operator sets
    # a real key — an unset secret must never mean "no auth required".
    # Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"
    admin_api_key: str = ""

    # Runtime
    environment: str = "development"  # 'development' or 'production'

    @field_validator("environment", mode="before")
    @classmethod
    def normalise_environment(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("ENVIRONMENT must be a string")
        value = value.strip().lower()
        if value not in {"development", "production"}:
            raise ValueError("ENVIRONMENT must be either 'development' or 'production'.")
        return value

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def normalise_allowed_origins(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("ALLOWED_ORIGINS must be a comma-separated string")
        return ",".join(origin.strip() for origin in value.split(",") if origin.strip())

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

    @model_validator(mode="after")
    def validate_production_security(self):
        """Reject unsafe browser-access settings before a production server starts."""
        if self.environment == "production" and self.allowed_origins == "*":
            raise ValueError("ALLOWED_ORIGINS cannot be '*' in production.")
        if self.environment == "production" and any(
            not origin.startswith("https://") for origin in self.origins_list
        ):
            raise ValueError("ALLOWED_ORIGINS must use HTTPS in production.")
        return self


settings = Settings()
