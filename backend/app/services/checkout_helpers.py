from flask import jsonify, request

from app.models import Product
from app.services.auth_tokens import verify_checkout_token


def normalize_phone(phone: str) -> str:
    p = "".join(c for c in phone if c.isdigit() or c == "+")
    if p.startswith("0") and len(p) == 11:
        p = "91" + p[1:]
    if not p.startswith("+") and len(p) == 10:
        p = "91" + p
    return p


def auth_checkout():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None, jsonify({"error": "Missing checkout verification"}), 401
    token = auth[7:].strip()
    data = request.get_json(silent=True) or {}
    phone = data.get("phone")
    if not phone:
        return None, jsonify({"error": "phone required"}), 400
    phone = normalize_phone(str(phone))
    if not verify_checkout_token(token, phone):
        return None, jsonify({"error": "Invalid or expired verification"}), 401
    return phone, None


def validate_items(items_raw):
    if not isinstance(items_raw, list) or not items_raw:
        return None, "items required"
    total = 0
    resolved = []
    for row in items_raw:
        pid = row.get("product_id")
        qty = int(row.get("qty", 0))
        if not pid or qty < 1:
            return None, "invalid line"
        p = Product.query.filter_by(id=pid, active=True).first()
        if not p or p.stock < qty:
            return None, f"unavailable: {pid}"
        line = p.price_paise * qty
        total += line
        resolved.append((p, qty))
    return resolved, total
