import os
import time
from typing import Optional

import jwt


def admin_token(username: str) -> str:
    exp = int(time.time()) + int(os.getenv("ADMIN_JWT_EXPIRES_MIN", "4320")) * 60
    return jwt.encode(
        {"sub": username, "exp": exp, "typ": "admin"},
        os.getenv("SECRET_KEY", "dev"),
        algorithm="HS256",
    )


def verify_admin_token(token: str) -> Optional[str]:
    try:
        data = jwt.decode(token, os.getenv("SECRET_KEY", "dev"), algorithms=["HS256"])
        if data.get("typ") != "admin":
            return None
        return data.get("sub")
    except jwt.PyJWTError:
        return None


def checkout_verify_token(phone: str) -> str:
    exp = int(time.time()) + 15 * 60
    return jwt.encode(
        {"phone": phone, "exp": exp, "typ": "checkout"},
        os.getenv("SECRET_KEY", "dev"),
        algorithm="HS256",
    )


def verify_checkout_token(token: str, expected_phone: str) -> bool:
    try:
        data = jwt.decode(token, os.getenv("SECRET_KEY", "dev"), algorithms=["HS256"])
        if data.get("typ") != "checkout":
            return False
        return data.get("phone") == expected_phone
    except jwt.PyJWTError:
        return False
