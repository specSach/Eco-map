import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Marker, User
from app.schemas import (
    AuthOut,
    CleanupSlotCreateIn,
    CleanupSlotJoinIn,
    LoginIn,
    MarkerOut,
    PasswordUpdateIn,
    ProfileUpdateIn,
    RegisterIn,
    StatsOut,
    UserOut,
    UserStatsOut,
)
from app.security import create_access_token, hash_password, verify_password

router = APIRouter()
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[User, Depends(get_current_user)]
IMAGE_CONTENT_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024
CLEANUP_REVIEW_PERIOD = timedelta(hours=24)


def is_valid_image(content: bytes, content_type: str) -> bool:
    signatures = {
        "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
        "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/webp": lambda data: data.startswith(b"RIFF") and data[8:12] == b"WEBP",
        "image/gif": lambda data: data.startswith((b"GIF87a", b"GIF89a")),
    }
    validator = signatures.get(content_type)
    return validator is not None and validator(content)


def save_image(upload: UploadFile) -> str:
    content_type = upload.content_type or ""
    extension = IMAGE_CONTENT_TYPES.get(content_type)
    if extension is None:
        raise HTTPException(status_code=415, detail="Поддерживаются JPEG, PNG, WebP и GIF")
    content = upload.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Размер фотографии не должен превышать 8 МБ")
    if not content:
        raise HTTPException(status_code=422, detail="Файл фотографии пуст")
    if not is_valid_image(content, content_type):
        raise HTTPException(status_code=415, detail="Содержимое файла не соответствует формату изображения")
    upload_dir = Path(get_settings().upload_dir)
    try:
        upload_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create upload directory: {str(e)}")
    filename = f"{uuid4().hex}{extension}"
    (upload_dir / filename).write_bytes(content)
    return f"/uploads/{filename}"


def parse_categories(value: str) -> list[str]:
    try:
        categories = json.loads(value)
        if not isinstance(categories, list) or not categories or not all(isinstance(item, str) and item.strip() for item in categories):
            raise ValueError
        return [item.strip() for item in categories]
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=422, detail="Выберите хотя бы одну категорию") from None


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
        creator_email=marker.author.email,
        status=marker.status,
        cleanup_slots=marker.cleanup_slots or [],
        cleaned_at=marker.cleaned_at,
        evidence_photo=marker.evidence_photo,
        is_cleared=marker.is_cleared,
    )


def get_marker(db: Session, marker_id: int) -> Marker:
    marker = db.scalar(select(Marker).options(joinedload(Marker.author)).where(Marker.id == marker_id))
    if marker is None or marker.is_cleared:
        raise HTTPException(status_code=404, detail="Метка не найдена")
    return marker


def require_marker_owner(marker: Marker, user: User) -> None:
    if marker.author_id != user.id:
        raise HTTPException(status_code=403, detail="Это действие доступно только автору метки")


def finalize_expired_cleanups(db: Session) -> int:
    cutoff = datetime.now(timezone.utc) - CLEANUP_REVIEW_PERIOD
    expired = db.scalars(
        select(Marker).where(
            Marker.is_cleared.is_(False),
            Marker.status == "cleanup_requested",
            Marker.cleaned_at.is_not(None),
            Marker.cleaned_at <= cutoff,
        )
    ).all()
    if not expired:
        return 0
    now = datetime.now(timezone.utc)
    for marker in expired:
        marker.is_cleared = True
        marker.status = "cleaned"
        marker.cleaned_at = now
    db.commit()
    return len(expired)


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


@router.get("/users/me/stats", response_model=UserStatsOut)
def get_user_stats(db: db_dependency, user: user_dependency) -> UserStatsOut:
    total_markers = db.scalar(
        select(func.count(Marker.id)).where(Marker.author_id == user.id)
    ) or 0
    return UserStatsOut(total_markers=total_markers)


@router.get("/stats", response_model=StatsOut)
def get_stats(db: db_dependency) -> StatsOut:
    finalize_expired_cleanups(db)
    total_users = db.scalar(select(func.count(User.id))) or 0
    total_markers = db.scalar(select(func.count(Marker.id))) or 0
    cleaned_markers = db.scalar(
        select(func.count(Marker.id)).where(or_(Marker.is_cleared.is_(True), Marker.status == "cleaned"))
    ) or 0
    rate = round(cleaned_markers / total_markers * 100) if total_markers > 0 else 0
    return StatsOut(
        total_users=total_users,
        total_markers=total_markers,
        cleaned_markers=cleaned_markers,
        cleanup_rate_percent=rate,
    )


@router.get("/markers", response_model=list[MarkerOut])
def list_markers(db: db_dependency) -> list[MarkerOut]:
    finalize_expired_cleanups(db)
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
    parsed_categories = parse_categories(categories)
    photo = save_image(photo_file) if photo_file is not None else (photo_url or "")
    if photo_file is None and not photo.startswith(("https://", "http://")):
        raise HTTPException(status_code=422, detail="Добавьте фотографию или корректную ссылку")
    marker = Marker(
        latitude=lat,
        longitude=lng,
        address=address.strip(),
        categories=parsed_categories,
        volume=volume,
        description=description.strip() or "Описание не добавлено.",
        photo=photo,
        author=user,
        status="active",
        cleanup_slots=[],
    )
    db.add(marker)
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.patch("/markers/{marker_id}", response_model=MarkerOut)
def update_marker(
    marker_id: int,
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
    marker = get_marker(db, marker_id)
    require_marker_owner(marker, user)
    marker.latitude = lat
    marker.longitude = lng
    marker.address = address.strip()
    marker.categories = parse_categories(categories)
    marker.volume = volume
    marker.description = description.strip() or "Описание не добавлено."
    if photo_file is not None:
        marker.photo = save_image(photo_file)
    elif photo_url:
        if not photo_url.startswith(("https://", "http://", "/uploads/")):
            raise HTTPException(status_code=422, detail="Некорректная ссылка на фотографию")
        marker.photo = photo_url
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.post("/markers/{marker_id}/cleanup", response_model=MarkerOut)
def request_cleanup(
    marker_id: int,
    db: db_dependency,
    _user: user_dependency,
    evidence_photo: Annotated[UploadFile, File()],
) -> MarkerOut:
    marker = get_marker(db, marker_id)
    if marker.status != "active":
        raise HTTPException(status_code=409, detail="Метка уже находится на проверке")
    marker.status = "cleanup_requested"
    marker.cleaned_at = datetime.now(timezone.utc)
    marker.evidence_photo = save_image(evidence_photo)
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.post("/markers/{marker_id}/cleanup/reject", response_model=MarkerOut)
def reject_cleanup(marker_id: int, db: db_dependency, user: user_dependency) -> MarkerOut:
    marker = get_marker(db, marker_id)
    require_marker_owner(marker, user)
    if marker.status != "cleanup_requested":
        raise HTTPException(status_code=409, detail="Метка не находится на проверке")
    marker.status = "active"
    marker.cleaned_at = None
    marker.evidence_photo = None
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.post("/markers/{marker_id}/cleanup/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirm_cleanup(marker_id: int, db: db_dependency, user: user_dependency) -> None:
    marker = get_marker(db, marker_id)
    require_marker_owner(marker, user)
    if marker.status != "cleanup_requested":
        raise HTTPException(status_code=409, detail="Метка не находится на проверке")
    marker.status = "cleaned"
    marker.is_cleared = True
    marker.cleaned_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/markers/{marker_id}/cleanup-slots", response_model=MarkerOut)
def add_cleanup_slot(marker_id: int, payload: CleanupSlotCreateIn, db: db_dependency, user: user_dependency) -> MarkerOut:
    marker = get_marker(db, marker_id)
    starts_at = payload.starts_at if payload.starts_at.tzinfo else payload.starts_at.replace(tzinfo=timezone.utc)
    if starts_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="Выберите время в будущем")
    slots = list(marker.cleanup_slots or [])
    slot_id = int(datetime.now(timezone.utc).timestamp() * 1000)
    existing_ids = {slot.get("id") for slot in slots}
    while slot_id in existing_ids:
        slot_id += 1
    name = f"{user.first_name} {user.last_name}".strip()
    slots.append({
        "id": slot_id,
        "startsAt": starts_at.isoformat(),
        "creatorEmail": user.email,
        "creatorName": name,
        "participants": [{"email": user.email, "name": name, "peopleCount": payload.people_count}],
    })
    marker.cleanup_slots = sorted(slots, key=lambda slot: slot.get("startsAt", ""))
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.post("/markers/{marker_id}/cleanup-slots/{slot_id}/join", response_model=MarkerOut)
def join_cleanup_slot(marker_id: int, slot_id: int, payload: CleanupSlotJoinIn, db: db_dependency, user: user_dependency) -> MarkerOut:
    marker = get_marker(db, marker_id)
    slots = list(marker.cleanup_slots or [])
    target = next((slot for slot in slots if slot.get("id") == slot_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Время групповой уборки не найдено")
    name = f"{user.first_name} {user.last_name}".strip()
    participants = [entry for entry in target.get("participants", []) if str(entry.get("email", "")).lower() != user.email.lower()]
    participants.append({"email": user.email, "name": name, "peopleCount": payload.people_count})
    target["participants"] = participants
    marker.cleanup_slots = slots
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.delete("/markers/{marker_id}/cleanup-slots/{slot_id}", response_model=MarkerOut)
def remove_cleanup_slot(marker_id: int, slot_id: int, db: db_dependency, user: user_dependency) -> MarkerOut:
    marker = get_marker(db, marker_id)
    slots = list(marker.cleanup_slots or [])
    target = next((slot for slot in slots if slot.get("id") == slot_id), None)
    if target is None:
        raise HTTPException(status_code=404, detail="Группа уборки не найдена")
    is_marker_owner = marker.author_id == user.id
    is_slot_owner = str(target.get("creatorEmail", "")).lower() == user.email.lower()
    if not is_marker_owner and not is_slot_owner:
        raise HTTPException(status_code=403, detail="Удалить группу может автор метки или создатель группы")
    marker.cleanup_slots = [slot for slot in slots if slot.get("id") != slot_id]
    db.commit()
    db.refresh(marker)
    return marker_response(marker)


@router.delete("/markers/{marker_id}", status_code=status.HTTP_204_NO_CONTENT)
def clear_marker(marker_id: int, db: db_dependency, user: user_dependency) -> None:
    marker = get_marker(db, marker_id)
    require_marker_owner(marker, user)
    marker.status = "cleaned"
    marker.is_cleared = True
    marker.cleaned_at = datetime.now(timezone.utc)
    db.commit()
