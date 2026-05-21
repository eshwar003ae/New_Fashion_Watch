import os
import smtplib
import logging
from email.message import EmailMessage

import requests

log = logging.getLogger(__name__)


def _msg91_send_sms(phone: str, message: str) -> bool:
    key = os.getenv("MSG91_AUTHKEY", "").strip()
    tid = os.getenv("MSG91_TEMPLATE_ID", "").strip()
    sender = os.getenv("MSG91_SENDER_ID", "").strip()
    if not key or not tid:
        return False
    # MSG91 flow template API varies; generic OTP uses different endpoint.
    # For transactional text, many accounts use SMS API — document simple flow.
    url = "https://control.msg91.com/api/v5/flow/"
    payload = {
        "template_id": tid,
        "short_url": "0",
        "recipients": [{"mobiles": phone.replace("+", ""), "VAR1": message[:500]}],
    }
    try:
        r = requests.post(
            url,
            json=payload,
            headers={"authkey": key, "Content-Type": "application/json"},
            timeout=15,
        )
        if r.status_code >= 400:
            log.warning("MSG91 error: %s %s", r.status_code, r.text)
            return False
        return True
    except Exception as e:
        log.warning("MSG91 exception: %s", e)
        return False


def send_sms(phone: str, body: str) -> None:
    phone = phone.strip().replace(" ", "")
    if phone.startswith("0") and len(phone) == 11:
        phone = "91" + phone[1:]
    if not phone.startswith("+"):
        if len(phone) == 10:
            phone = "91" + phone
    log.info("SMS to %s: %s", phone, body)
    if _msg91_send_sms(phone, body):
        return
    # Dev fallback: console only
    print(f"[SMS would send] -> {phone}\n{body}\n")


def send_email(to_addr: str, subject: str, body: str) -> None:
    host = os.getenv("SMTP_HOST", "").strip()
    if not host or not to_addr:
        log.info("Email (no SMTP or to): %s — %s", subject, body[:200])
        return
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("SMTP_FROM", user)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg.set_content(body)
    with smtplib.SMTP(host, port) as s:
        s.starttls()
        if user:
            s.login(user, password)
        s.send_message(msg)


def notify_order_placed(order, shop_name: str = "Watch Shop") -> None:
    """Customer + admin notifications (SMS + email when configured)."""
    items_list = order.items.all()

    lines = []
    for it in items_list:
        lines.append(f"- {it.title_snapshot} x{it.qty} @ ₹{it.unit_price_paise/100:.2f} each")
    items_text = "\n".join(lines)
    total_rupees = order.total_paise / 100
    pay = order.payment_mode.upper()
    pay_note = "Pay on delivery" if order.payment_mode == "cod" else f"Online ({order.payment_status})"

    cust_sms = (
        f"[{shop_name}] Order {order.public_id} placed. "
        f"Total Rs {total_rupees:.0f}. {pay_note}. "
        f"Thank you!"
    )
    send_sms(order.phone, cust_sms)

    cust_email = order.email or ""
    if cust_email:
        send_email(
            cust_email,
            f"Order confirmed — {order.public_id}",
            f"Hi {order.customer_name},\n\nYour order is placed.\n\n{items_text}\n\nTotal: Rs {total_rupees:.2f}\n{pay_note}\n\n"
            f"Ship to: {order.address_line1}, {order.address_line2}, {order.city}, {order.state} - {order.pincode}\n",
        )

    admin_phone = os.getenv("ADMIN_PHONE", "").strip()
    if admin_phone:
        first_title = items_list[0].title_snapshot if items_list else "—"
        admin_sms = (
            f"[{shop_name}] NEW {order.public_id}. {order.customer_name} {order.phone}. "
            f"Rs {total_rupees:.0f} {pay}. Items: {first_title}"
        )
        send_sms(admin_phone, admin_sms[:480])

    admin_email = os.getenv("ADMIN_EMAIL", "").strip()
    if admin_email:
        addr = f"{order.address_line1}\n{order.address_line2}\n{order.city}, {order.state} {order.pincode}"
        send_email(
            admin_email,
            f"New order {order.public_id}",
            f"Customer: {order.customer_name}\nPhone: {order.phone}\nEmail: {order.email or '—'}\n\n"
            f"Items:\n{items_text}\n\nTotal: Rs {total_rupees:.2f}\nPayment: {order.payment_mode} / {order.payment_status}\n\n"
            f"Address:\n{addr}\n",
        )
