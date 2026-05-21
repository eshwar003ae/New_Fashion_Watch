import re
import secrets
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash, check_password_hash

from .extensions import db


def slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[-\s]+", "-", s)
    return s or "item"


class AdminUser(db.Model):
    __tablename__ = "admin_users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)


class Product(db.Model):
    __tablename__ = "products"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(220), unique=True, nullable=False, index=True)
    description = db.Column(db.Text, default="")
    price_paise = db.Column(db.Integer, nullable=False)  # INR in paise
    stock = db.Column(db.Integer, default=0)
    active = db.Column(db.Boolean, default=True)
    video_url = db.Column(db.String(500), default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    images = db.relationship(
        "ProductImage", backref="product", lazy="dynamic", cascade="all, delete-orphan"
    )

    def to_public_dict(self):
        imgs = [i.url for i in self.images.order_by(ProductImage.sort_order)]
        return {
            "id": self.id,
            "title": self.title,
            "slug": self.slug,
            "description": self.description,
            "price_paise": self.price_paise,
            "stock": self.stock,
            "images": imgs,
            "video_url": self.video_url or "",
        }


class ProductImage(db.Model):
    __tablename__ = "product_images"
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    url = db.Column(db.String(500), nullable=False)
    sort_order = db.Column(db.Integer, default=0)


class OtpChallenge(db.Model):
    __tablename__ = "otp_challenges"
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), nullable=False, index=True)
    code_hash = db.Column(db.String(128), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Order(db.Model):
    __tablename__ = "orders"
    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(db.String(32), unique=True, nullable=False, index=True)
    customer_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), default="")
    address_line1 = db.Column(db.String(200), nullable=False)
    address_line2 = db.Column(db.String(200), default="")
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    pincode = db.Column(db.String(12), nullable=False)
    payment_mode = db.Column(db.String(20), nullable=False)  # cod | online
    payment_status = db.Column(db.String(20), default="pending")  # pending | paid | failed
    razorpay_order_id = db.Column(db.String(64), default="")
    razorpay_payment_id = db.Column(db.String(64), default="")
    total_paise = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", lazy="dynamic", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "public_id": self.public_id,
            "customer_name": self.customer_name,
            "phone": self.phone,
            "email": self.email,
            "address": {
                "line1": self.address_line1,
                "line2": self.address_line2,
                "city": self.city,
                "state": self.state,
                "pincode": self.pincode,
            },
            "payment_mode": self.payment_mode,
            "payment_status": self.payment_status,
            "total_paise": self.total_paise,
            "items": [i.to_dict() for i in self.items.all()],
            "created_at": self.created_at.isoformat() + "Z",
        }


class OrderItem(db.Model):
    __tablename__ = "order_items"
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    product_id = db.Column(db.Integer, nullable=False)
    title_snapshot = db.Column(db.String(200), nullable=False)
    qty = db.Column(db.Integer, nullable=False)
    unit_price_paise = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "product_id": self.product_id,
            "title": self.title_snapshot,
            "qty": self.qty,
            "unit_price_paise": self.unit_price_paise,
            "line_total_paise": self.unit_price_paise * self.qty,
        }


def ensure_product_columns():
    """Add new columns to existing SQLite DBs without a migration tool."""
    from sqlalchemy import inspect, text

    insp = inspect(db.engine)
    if not insp.has_table("products"):
        return
    cols = {c["name"] for c in insp.get_columns("products")}
    if "video_url" not in cols:
        db.session.execute(
            text('ALTER TABLE products ADD COLUMN video_url VARCHAR(500) DEFAULT ""')
        )
        db.session.commit()


def ensure_admin_user():
    import os

    username = os.getenv("ADMIN_USERNAME", "admin")
    password = os.getenv("ADMIN_PASSWORD", "changeme")
    pw_hash = generate_password_hash(password)

    # Single admin account — sync username/password from .env on startup
    AdminUser.query.filter(AdminUser.username != username).delete()
    u = AdminUser.query.filter_by(username=username).first()
    if u:
        u.password_hash = pw_hash
    else:
        db.session.add(AdminUser(username=username, password_hash=pw_hash))
    db.session.commit()


def seed_demo_products():
    if Product.query.count() > 0:
        return
    demos = [
        ("Classic Steel Watch", "Reliable quartz movement, stainless steel case, 42mm.", 499900, 15),
        ("Sport Chronograph", "Water resistant, stopwatch, rubber strap.", 899900, 8),
    ]
    for title, desc, paise, stock in demos:
        base = slugify(title)
        p = Product(
            title=title,
            slug=base,
            description=desc,
            price_paise=paise,
            stock=stock,
            active=True,
        )
        db.session.add(p)
    db.session.commit()


def verify_admin_password(username: str, password: str) -> bool:
    u = AdminUser.query.filter_by(username=username).first()
    if not u:
        return False
    return check_password_hash(u.password_hash, password)


def generate_public_order_id() -> str:
    return "ORD-" + secrets.token_hex(4).upper()
