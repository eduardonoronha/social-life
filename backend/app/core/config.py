from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://social:social_dev@localhost:5432/social_life"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 1440
    daily_limit_minutes: int = 60
    weekly_limit_minutes: int = 360
    storage_endpoint: str = "localhost:9000"
    storage_public_endpoint: str = "localhost:9000"
    storage_access_key: str = "social_storage"
    storage_secret_key: str = "social_storage_dev"
    storage_bucket: str = "social-life"
    storage_secure: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
