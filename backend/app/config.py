"""
|| App_Configuration || —> reads from .env (Environment_Variables).
No Hardcoded Credentials within this File ...
"""

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Data_Retrieval--Conf.
    use_mock_db: bool = True

    # MySQL--Conf.
    mysql_host: str = "localhost"
    mysql_port: int = 3306
    mysql_user: str = "root"
    mysql_password: str = ""
    mysql_database: str = "sikkim_tourism"

    # Gemini--Conf.
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    # Embedding_Model--Conf.
    gemini_embedding_model: str = "models/gemini-embedding-001"

    # Groq--Conf.
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    groq_fallback_model: str = "llama-3.1-8b-instant"

    # Prompt_Guard--Conf.
    enable_prompt_guard: bool = False
    prompt_guard_model: str = "meta-llama/llama-prompt-guard-2-86m"

    # Tavily_Web_Search--Conf.
    tavily_api_key: str = ""

    # Follow_Up_Suggestions--Conf.
    enable_followups: bool = False

    # Vector_Store--Conf.
    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "sikkim_destinations"

    # Cross_Origin_Resource_Sharing--Conf
    allowed_origins: str = "http://localhost:5173"
    allowed_methods: str = "GET, POST, OPTIONS"
    allowed_headers: str = "Content-Type, Authorization, X-Admin-Key"

    # Circular_Scraper--Conf.
    circulars_allowed_host: str = "sikkimtourism.gov.in"
    circulars_notice_url: str = "https://sikkimtourism.gov.in/updates/notice"
    circulars_sync_interval_minutes: int = 45
    circulars_max_pdf_bytes: int = 15 * 1024 * 1024
    circulars_max_per_run: int = 20
    enable_circular_scraper: bool = False

    # Administrator_Authentication--Conf.
    admin_api_key: str = ""

    # Runtime--Conf.
    environment: str = "development"

    # Environment_Normalizer--Validator
    @field_validator("environment", mode="before")
    @classmethod
    def normalise_environment(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("ENVIRONMENT, must be of 'string' type.")
        value = value.strip().lower()
        if value not in {"development", "production"}:
            raise ValueError("ENVIRONMENT, must be either 'development' or 'production'. ")
        return value

    # Allowed_Origins--Validator
    @field_validator("allowed_origins", mode="before")
    @classmethod
    def normalise_allowed_origins(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("ALLOWED_ORIGINS must be a comma-separated string")
        return ",".join(origin.strip() for origin in value.split(",") if origin.strip())

    # Database_Mode--Validator
    @property
    def db_mode(self) -> str:
        return "Mock_Database" if self.use_mock_db else "MySQL_Database"

    # Origins_List--Validator
    @property
    def origins_list(self) -> list[str]:
        if self.allowed_origins == "*":
            import logging
            logging.warning("Allowed Origins is set to '*', which allows all origins. This may pose security risk in production.")
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    # HTTP_Methods--Validator
    @property
    def methods_list(self) -> list[str]:
        return [m.strip() for m in self.allowed_methods.split(",") if m.strip()]

    # HTTP_Headers--Validator
    @property
    def headers_list(self) -> list[str]:
        return [h.strip() for h in self.allowed_headers.split(",") if h.strip()]

    # Qdrant_Mode--Validator
    @property
    def qdrant_mode(self) -> str:
        return "Remote_Qdrant" if self.qdrant_url else "Local_Qdrant"

    # CORS_&_HTTPS--Validator
    @model_validator(mode="after")
    def validate_production_security(self):
        """Reject unsafe browser-access settings before a production server starts."""
        if self.environment == "production" and self.allowed_origins == "*":
            raise ValueError("In production, allowed origins cannot be '*'. Please specify allowed origins for security reasons.")
        if self.environment == "production" and any(not origin.startswith("https://") for origin in self.origins_list):
            raise ValueError("In production, all allowed origins must use 'HTTPS' for security reasons.")
        return self


settings = Settings()
