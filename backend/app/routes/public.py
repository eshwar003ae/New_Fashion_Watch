import os

from flask import Blueprint, jsonify, request, send_from_directory

from app.extensions import db
from app.models import Product, Order, OrderItem, generate_public_order_id
from app.services.checkout_helpers import auth_checkout, validate_items
from app.services.notifications import notify_order_placed

bp = Blueprint("public", __name__)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "uploads")


def _upload_path():
    path = os.path.abspath(UPLOAD_DIR)
    os.makedirs(path, exist_ok=True)
    return path


@bp.route("/media/<path:name>")
def media(name):
    return send_from_directory(_upload_path(), name, as_attachment=False)


@bp.route("/products", methods=["GET"])
def list_products():
    q = Product.query.filter_by(active=True).order_by(Product.created_at.desc())
    return jsonify([p.to_public_dict() for p in q])


@bp.route("/products/<slug>", methods=["GET"])
def product_detail(slug):
    p = Product.query.filter_by(slug=slug, active=True).first()
    if not p:
        return jsonify({"error": "Not found"}), 404
    return jsonify(p.to_public_dict())


@bp.route("/orders/cod", methods=["POST"])
def order_cod():
    data = request.get_json(force=True, silent=True) or {}
    phone, err = auth_checkout()
    if err:
        return err
    items_raw = data.get("items")
    resolved, total_or_err = validate_items(items_raw)
    if resolved is None:
        return jsonify({"error": total_or_err}), 400
    total = total_or_err

    name = (data.get("customer_name") or "").strip()
    if not name:
        return jsonify({"error": "customer_name required"}), 400
    addr1 = (data.get("address_line1") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    pin = (data.get("pincode") or "").strip()
    if not all([addr1, city, state, pin]):
        return jsonify({"error": "address fields required"}), 400

    oid = generate_public_order_id()
    order = Order(
        public_id=oid,
        customer_name=name,
        phone=phone,
        email=(data.get("email") or "").strip(),
        address_line1=addr1,
        address_line2=(data.get("address_line2") or "").strip(),
        city=city,
        state=state,
        pincode=pin,
        payment_mode="cod",
        payment_status="pending",
        total_paise=total,
    )
    db.session.add(order)
    db.session.flush()
    for p, qty in resolved:
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=p.id,
                title_snapshot=p.title,
                qty=qty,
                unit_price_paise=p.price_paise,
            )
        )
        p.stock -= qty
    db.session.commit()
    notify_order_placed(order)
    return jsonify({"order": order.to_dict()}), 201


@bp.route("/orders/online-confirm", methods=["POST"])
def order_online_confirm():
    import razorpay

    data = request.get_json(force=True, silent=True) or {}
    phone, err = auth_checkout()
    if err:
        return err

    r_order_id = (data.get("razorpay_order_id") or "").strip()
    r_pay_id = (data.get("razorpay_payment_id") or "").strip()
    r_sig = (data.get("razorpay_signature") or "").strip()
    if not all([r_order_id, r_pay_id, r_sig]):
        return jsonify({"error": "razorpay fields required"}), 400

    key = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if not key:
        return jsonify({"error": "Payments not configured"}), 503
    client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID", ""), key))
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": r_order_id,
                "razorpay_payment_id": r_pay_id,
                "razorpay_signature": r_sig,
            }
        )
    except razorpay.errors.SignatureVerificationError:
        return jsonify({"error": "Invalid payment signature"}), 400

    items_raw = data.get("items")
    resolved, total_or_err = validate_items(items_raw)
    if resolved is None:
        return jsonify({"error": total_or_err}), 400
    total = total_or_err

    try:
        ro = client.order.fetch(r_order_id)
        if int(ro.get("amount", 0)) != total:
            return jsonify({"error": "Amount mismatch"}), 400
    except Exception:
        pass

    name = (data.get("customer_name") or "").strip()
    if not name:
        return jsonify({"error": "customer_name required"}), 400
    addr1 = (data.get("address_line1") or "").strip()
    city = (data.get("city") or "").strip()
    state = (data.get("state") or "").strip()
    pin = (data.get("pincode") or "").strip()
    if not all([addr1, city, state, pin]):
        return jsonify({"error": "address fields required"}), 400

    oid = generate_public_order_id()
    order = Order(
        public_id=oid,
        customer_name=name,
        phone=phone,
        email=(data.get("email") or "").strip(),
        address_line1=addr1,
        address_line2=(data.get("address_line2") or "").strip(),
        city=city,
        state=state,
        pincode=pin,
        payment_mode="online",
        payment_status="paid",
        razorpay_order_id=r_order_id,
        razorpay_payment_id=r_pay_id,
        total_paise=total,
    )
    db.session.add(order)
    db.session.flush()
    for p, qty in resolved:
        db.session.add(
            OrderItem(
                order_id=order.id,
                product_id=p.id,
                title_snapshot=p.title,
                qty=qty,
                unit_price_paise=p.price_paise,
            )
        )
        p.stock -= qty
    db.session.commit()
    notify_order_placed(order)
    return jsonify({"order": order.to_dict()}), 201
