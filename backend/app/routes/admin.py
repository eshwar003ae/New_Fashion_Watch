from functools import wraps
import os
import uuid

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app.extensions import db
from app.models import Order, Product, ProductImage, slugify, verify_admin_password
from app.services.auth_tokens import admin_token, verify_admin_token

bp = Blueprint("admin", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")


def _upload_path():
    path = os.path.abspath(UPLOAD_DIR)
    os.makedirs(path, exist_ok=True)
    return path


def _media_basename(url: str) -> str:
    if not url:
        return ""
    return url.rsplit("/", 1)[-1]


def _delete_media_file(url: str) -> None:
    name = _media_basename(url)
    if not name:
        return
    path = os.path.join(_upload_path(), name)
    if os.path.isfile(path):
        os.remove(path)


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        sub = verify_admin_token(auth[7:].strip())
        if not sub:
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)

    return decorated


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    u = (data.get("username") or "").strip()
    p = (data.get("password") or "").strip()
    if not u or not verify_admin_password(u, p):
        return jsonify({"error": "Invalid credentials"}), 401
    return jsonify({"token": admin_token(u)})


@bp.route("/orders", methods=["GET"])
@admin_required
def list_orders():
    rows = Order.query.order_by(Order.created_at.desc()).limit(200).all()
    return jsonify([o.to_dict() for o in rows])


@bp.route("/products", methods=["GET"])
@admin_required
def admin_list_products():
    rows = Product.query.order_by(Product.created_at.desc()).all()
    return jsonify([p.to_public_dict() | {"active": p.active, "stock": p.stock} for p in rows])


@bp.route("/products", methods=["POST"])
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title required"}), 400
    price_rupees = float(data.get("price_rupees") or 0)
    price_paise = int(round(price_rupees * 100))
    if price_paise < 1:
        return jsonify({"error": "invalid price"}), 400
    stock = int(data.get("stock") or 0)
    base = slugify(title)
    slug = base
    n = 0
    while Product.query.filter_by(slug=slug).first():
        n += 1
        slug = f"{base}-{n}"
    p = Product(
        title=title,
        slug=slug,
        description=(data.get("description") or "").strip(),
        price_paise=price_paise,
        stock=stock,
        active=bool(data.get("active", True)),
    )
    db.session.add(p)
    db.session.commit()
    return jsonify(p.to_public_dict()), 201


@bp.route("/products/<int:pid>", methods=["PUT"])
@admin_required
def update_product(pid):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json(silent=True) or {}
    if "title" in data:
        p.title = (data["title"] or "").strip() or p.title
    if "description" in data:
        p.description = (data.get("description") or "").strip()
    if "price_rupees" in data:
        price_paise = int(round(float(data["price_rupees"]) * 100))
        if price_paise > 0:
            p.price_paise = price_paise
    if "stock" in data:
        p.stock = int(data["stock"])
    if "active" in data:
        p.active = bool(data["active"])
    db.session.commit()
    return jsonify(p.to_public_dict())


@bp.route("/products/<int:pid>", methods=["DELETE"])
@admin_required
def delete_product(pid):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404
    for img in p.images.all():
        _delete_media_file(img.url)
    _delete_media_file(p.video_url or "")
    db.session.delete(p)
    db.session.commit()
    return jsonify({"ok": True})


@bp.route("/products/<int:pid>/images", methods=["POST"])
@admin_required
def upload_image(pid):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "file required"}), 400
    ext = os.path.splitext(f.filename)[1].lower() or ".jpg"
    if ext not in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        return jsonify({"error": "bad extension"}), 400
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(_upload_path(), name)
    f.save(path)
    rel = f"/api/media/{name}"
    mx = db.session.query(func.max(ProductImage.sort_order)).filter_by(product_id=p.id).scalar()
    sort_order = (mx or 0) + 1
    img = ProductImage(product_id=p.id, url=rel, sort_order=sort_order)
    db.session.add(img)
    db.session.commit()
    return jsonify({"url": rel}), 201


@bp.route("/products/<int:pid>/video", methods=["POST"])
@admin_required
def upload_video(pid):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "file required"}), 400
    ext = os.path.splitext(f.filename)[1].lower() or ".mp4"
    if ext not in (".mp4", ".webm", ".mov", ".ogg"):
        return jsonify({"error": "bad extension — use mp4, webm, mov, or ogg"}), 400
    if p.video_url:
        _delete_media_file(p.video_url)
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(_upload_path(), name)
    f.save(path)
    rel = f"/api/media/{name}"
    p.video_url = rel
    db.session.commit()
    return jsonify({"url": rel}), 201


@bp.route("/products/<int:pid>/video", methods=["DELETE"])
@admin_required
def delete_video(pid):
    p = db.session.get(Product, pid)
    if not p:
        return jsonify({"error": "Not found"}), 404
    if p.video_url:
        _delete_media_file(p.video_url)
        p.video_url = ""
        db.session.commit()
    return jsonify({"ok": True})
