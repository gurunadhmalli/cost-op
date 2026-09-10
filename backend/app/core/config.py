"""
Centralized settings, loaded from environment variables / .env.
See .env.example for every variable this app reads.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/ai_cost_db"

    # AI Assistant — Google Gemini API (free tier)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # Backend
    JWT_SECRET: str = "dev-secret-change-me"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # Simulator (stands in for real ERP / MES / IoT connectors)
    SIMULATOR_ENABLED: bool = True
    SIMULATOR_INTERVAL_SECONDS: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
