import hashlib
import os
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from app.extensions import db
from app.models import OtpChallenge
from app.services.auth_tokens import checkout_verify_token
from app.services.notifications import send_sms

bp = Blueprint("otp", __name__)


def _normalize_phone(phone: str) -> str:
    p = "".join(c for c in phone if c.isdigit() or c == "+")
    if p.startswith("0") and len(p) == 11:
        p = "91" + p[1:]
    if not p.startswith("+") and len(p) == 10:
        p = "91" + p
    return p


def _hash_code(phone: str, code: str) -> str:
    pepper = os.getenv("SECRET_KEY", "dev")
    return hashlib.sha256(f"{pepper}|{phone}|{code}".encode()).hexdigest()


@bp.route("/otp/request", methods=["POST"])
def otp_request():
    data = request.get_json(silent=True) or {}
    phone = _normalize_phone(str(data.get("phone") or ""))
    if len(phone) < 10:
        return jsonify({"error": "Invalid phone"}), 400

    code = f"{secrets.randbelow(1000000):06d}"
    now = datetime.utcnow()
    OtpChallenge.query.filter(OtpChallenge.phone == phone).delete()
    ch = OtpChallenge(
        phone=phone,
        code_hash=_hash_code(phone, code),
        expires_at=now + timedelta(minutes=10),
        attempts=0,
    )
    db.session.add(ch)
    db.session.commit()

    body = f"Your Watch Shop verification code is {code}. Valid 10 minutes."
    send_sms(phone, body)
    print(f"[DEV OTP] {phone} -> {code}")

    return jsonify({"ok": True, "message": "OTP sent"})


@bp.route("/otp/verify", methods=["POST"])
def otp_verify():
    data = request.get_json(silent=True) or {}
    phone = _normalize_phone(str(data.get("phone") or ""))
    code = str(data.get("code") or "").strip()
    if len(phone) < 10 or len(code) < 4:
        return jsonify({"error": "Invalid input"}), 400

    ch = (
        OtpChallenge.query.filter_by(phone=phone)
        .filter(OtpChallenge.expires_at > datetime.utcnow())
        .order_by(OtpChallenge.id.desc())
        .first()
    )
    if not ch:
        return jsonify({"error": "No active OTP"}), 400
    if ch.attempts >= 5:
        return jsonify({"error": "Too many attempts"}), 429
    ch.attempts += 1
    db.session.commit()

    if ch.code_hash != _hash_code(phone, code):
        return jsonify({"error": "Wrong OTP"}), 400

    OtpChallenge.query.filter_by(phone=phone).delete()
    db.session.commit()

    token = checkout_verify_token(phone)
    return jsonify({"checkout_token": token})
