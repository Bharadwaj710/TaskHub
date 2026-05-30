import os
from dotenv import load_dotenv

basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if os.getenv("FLASK_ENV") != "testing":
    load_dotenv(os.path.join(basedir, '.env'), override=True)

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL") # Supabase connection string
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    # Role Management
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").lower().strip()
    # Email (SMTP kept for reference; Resend replaces in Phase 8)
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    SMTP_USERNAME = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")