from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://social:social_dev@localhost:5432/social_life"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 1440
    daily_limit_minutes: int = 60
    weekly_limit_minutes: int = 360

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
