import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

from .extensions import db
from . import models  # noqa: F401


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__, static_folder=None)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-change-me")
    db_url = os.getenv("DATABASE_URL", "sqlite:///watchshop.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["MAX_CONTENT_LENGTH"] = 100 * 1024 * 1024  # 100 MB (videos)

    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    CORS(app, resources={r"/api/*": {"origins": origins}}, supports_credentials=True)

    db.init_app(app)

    from .routes.public import bp as public_bp
    from .routes.admin import bp as admin_bp
    from .routes.otp import bp as otp_bp
    from .routes.payments import bp as payments_bp

    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(otp_bp, url_prefix="/api")
    app.register_blueprint(payments_bp, url_prefix="/api")

    @app.cli.command("init-db")
    def init_db():
        with app.app_context():
            db.create_all()
            print("Database tables created.")

    with app.app_context():
        db.create_all()
        models.ensure_product_columns()
        models.ensure_admin_user()
        models.seed_demo_products()

    return app
