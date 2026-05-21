import os

import razorpay
from flask import Blueprint, jsonify, request

from app.services.checkout_helpers import auth_checkout, validate_items

bp = Blueprint("payments", __name__)


@bp.route("/payments/razorpay/create-order", methods=["POST"])
def razorpay_create_order():
    data = request.get_json(silent=True) or {}
    phone, err = auth_checkout()
    if err:
        return err

    items_raw = data.get("items")
    resolved, total_or_err = validate_items(items_raw)
    if resolved is None:
        return jsonify({"error": total_or_err}), 400
    total = total_or_err

    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if not key_id or not key_secret:
        return jsonify({"error": "Razorpay not configured"}), 503

    client = razorpay.Client(auth=(key_id, key_secret))
    receipt = f"rcpt_{phone[-6:]}_{total}"
    order = client.order.create(
        {"amount": total, "currency": "INR", "receipt": receipt[:40], "payment_capture": 1}
    )
    return jsonify(
        {
            "key_id": key_id,
            "amount_paise": total,
            "currency": "INR",
            "razorpay_order_id": order["id"],
        }
    )
