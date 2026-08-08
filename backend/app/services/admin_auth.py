"""
Python_Version_Integrate_Admin_Auth — Password Hashing & Credentials Service.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import secrets

_SCRYPT_N = 2**14
_SCRYPT_R = 8
_SCRYPT_P = 1
_DK_LEN = 64


# Python_Version_Integrate_Validate_Password--Function
def validate_password(password: str) -> str | None:
    """Return a public validation error, or ``None`` for an acceptable password."""
    if len(password) < 12:
        return "Password must contain at least 12 characters."
    if len(password) > 128:
        return "Password must contain no more than 128 characters."
    if not any(char.isalpha() for char in password) or not any(char.isdigit() for char in password):
        return "Password must include at least one letter and one number."
    return None


# Python_Version_Integrate_Hash_Password--Function
def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=_SCRYPT_N, r=_SCRYPT_R,
        p=_SCRYPT_P, dklen=_DK_LEN,
    )
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${_b64(salt)}${_b64(digest)}"



def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, n, r, p, salt, expected = encoded.split("$", 5)
        if algorithm != "scrypt":
            return False
        actual = hashlib.scrypt(
            password.encode("utf-8"), salt=_unb64(salt), n=int(n), r=int(r),
            p=int(p), dklen=_DK_LEN,
        )
        return hmac.compare_digest(actual, _unb64(expected))
    except (TypeError, ValueError):
        return False


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _unb64(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
