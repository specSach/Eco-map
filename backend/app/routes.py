import json
from pathlib import Path
from uuid import uuid4
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Marker, User
from app.schemas import AuthOut, LoginIn, MarkerOut, PasswordUpdateIn, ProfileUpdateIn, RegisterIn, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[User, Depends(get_current_user)]
IMAGE_CONTENT_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024


def is_valid_image(content: bytes, content_type: str) -> bool:
    signatures = {
        "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
        "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        "image/gif": lambda data: data.startswith((b"GIF87a", b"GIF89a")),
    }
    validator = signatures.get(content_type)
    return validator is not None and validator(content)


def auth_response(user: User) -> AuthOut:
    return AuthOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


def marker_response(marker: Marker) -> MarkerOut:
    return MarkerOut(
        id=marker.id,
        lat=marker.latitude,
        lng=marker.longitude,
        address=marker.address,
        categories=marker.categories,
        volume=marker.volume,
        description=marker.description,
        photo=marker.photo,
        date=marker.created_at,
        author=f"{marker.author.first_name} {marker.author.last_name[:1]}.",
        is_cleared=marker.is_cleared,
    )


@router.post("/auth/register", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: db_dependency) -> AuthOut:
    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=str(payload.email).lower(),
        password_hash=hash_password(payload.password),
    )
    if not user.first_name or not user.last_name:
        raise HTTPException(status_code=422, detail="Имя и фамилия обязательны")
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Аккаунт с такой почтой уже существует") from None
    db.refresh(user)
    return auth_response(user)


@router.post("/auth/login", response_model=AuthOut)
def login(payload: LoginIn, db: db_dependency) -> AuthOut:
    user = db.scalar(select(User).where(User.email == str(payload.email).lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверная почта или пароль")
    return auth_response(user)


@router.get("/auth/me", response_model=UserOut)
def current_user(user: user_dependency) -> User:
    return user


@router.patch("/users/me", response_model=UserOut)
def update_profile(payload: ProfileUpdateIn, db: db_dependency, user: user_dependency) -> User:
    user.first_name = payload.first_name
    user.last_name = payload.last_name
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/me/password", status_code=status.HTTP_204_NO_CONTENT)
def update_password(payload: PasswordUpdateIn, db: db_dependency, user: user_dependency) -> None:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно")
    user.password_hash = hash_password(payload.new_password)
    db.commit()


@router.get("/markers", response_model=list[MarkerOut])
def list_markers(db: db_dependency) -> list[MarkerOut]:
    markers = db.scalars(
        select(Marker).options(joinedload(Marker.author)).where(Marker.is_cleared.is_(False)).order_by(Marker.created_at.desc())
    ).all()
    return [marker_response(marker) for marker in markers]


@router.post("/markers", response_model=MarkerOut, status_code=status.HTTP_201_CREATED)
def create_marker(
    db: db_dependency,
    user: user_dependency,
    lat: Annotated[float, Form(ge=-90, le=90)],
    lng: Annotated[float, Form(ge=-180, le=180)],
    address: Annotated[str, Form(min_length=1, max_length=500)],
    categories: Annotated[str, Form()],
    volume: Annotated[str, Form(pattern="^(small|medium|large)$")],
    description: Annotated[str, Form(max_length=5000)],
    photo_url: Annotated[str | None, Form(max_length=1000)] = None,
    photo_file: Annotated[UploadFile | None, File()] = None,
) -> MarkerOut:
    try:
        parsed_categories = json.loads(categories)
        if not isinstance(parsed_categories, list) or not parsed_categories or not all(
            isinstance(item, str) and item.strip() for item in parsed_categories
        ):
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=422, detail="Выберите хотя бы одну категорию") from None

    photo = photo_url or ""
    if photo_file is not None:
        extension = IMAGE_CONTENT_TYPES.get(photo_file.content_type or "")
        if extension is None:
            raise HTTPException(status_code=415, detail="Поддерживаются JPEG, PNG, WebP и GIF")
        content = photo_file.file.read(MAX_IMAGE_BYTES + 1)
        if len(content) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="Размер фото не должен превышать 8 МБ")
        if not content:
            raise HTTPException(status_code=422, detail="Файл фотографии пуст")
        if not is_valid_image(content, photo_file.content_type or ""):
            raise HTTPException(status_code=415, detail="Содержимое файла не соответствует формату изображения")
        upload_dir = Path(get_settings().upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{uuid4().hex}{extension}"
        (upload_dir / filename).write_bytes(content)
        photo = f"/uploads/{filename}"
    elif not photo.startswith(("https://", "http://")):
        raise HTTPException(status_code=422, detail="Добавьте фотографию или укажите корректную ссылку")

    marker = Marker(
        latitude=lat,
        longitude=lng,
        address=address.strip(),
        categories=parsed_categories,
        volume=volume,
        description=description.strip() or "Описание не добавлено.",
        photo=photo,
        author=user,
    )
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.delete("/markers/{marker_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_marker(marker_id: int, db: db_dependency, _user: user_dependency) -> None:
    marker = db.get(Marker, marker_id)
    if marker is None or marker.is_cleared:
        raise HTTPException(status_code=404, detail="Метка не найдена")
    marker.is_cleared = True
    db.commit()
