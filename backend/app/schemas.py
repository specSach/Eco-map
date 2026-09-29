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
    is_cleared: bool

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
