from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    ANTHROPIC_API_KEY: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    UPLOAD_DIR: str = "./uploads"
    ALGORITHM: str = "HS256"
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()