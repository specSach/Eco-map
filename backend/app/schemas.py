from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def to_camel(value: str) -> str:
    return "".join(part.title() if index else part for index, part in enumerate(value.split("_")))


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr

    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)


class AuthOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    user: UserOut


class RegisterIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileUpdateIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)

    @field_validator("first_name", "last_name")
    @classmethod
    def trim_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Имя не может быть пустым")
        return value


class PasswordUpdateIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class MarkerOut(BaseModel):
    id: int
    lat: float
    lng: float
    address: str
    categories: list[str]
    volume: Literal["small", "medium", "large"]
    description: str
    photo: str
    date: datetime
    author: str
    creator_email: str
    status: str
    cleanup_slots: list[dict]
    cleaned_at: datetime | None
    evidence_photo: str | None
    is_cleared: bool

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class MarkerUpdateIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    address: str = Field(min_length=1, max_length=500)
    categories: list[str] = Field(min_length=1)
    volume: Literal["small", "medium", "large"]
    description: str = Field(max_length=5000)
    photo: str = Field(max_length=1000)


class CleanupSlotCreateIn(BaseModel):
    starts_at: datetime
    people_count: int = Field(ge=1, le=100)


class CleanupSlotJoinIn(BaseModel):
    people_count: int = Field(ge=1, le=100)


class StatsOut(BaseModel):
    total_users: int
    total_markers: int
    cleaned_markers: int
    cleanup_rate_percent: int

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
