from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

password_hash = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def create_access_token(user_id: int) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expires}, settings.jwt_secret_key, algorithm="HS256")


def get_token_user_id(token: str) -> int:
    payload = jwt.decode(token, get_settings().jwt_secret_key, algorithms=["HS256"])
    subject = payload.get("sub")
    if not isinstance(subject, str):
        raise ValueError("Invalid token subject")
    return int(subject)
