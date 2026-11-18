from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import jwt

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import User
from app.schemas.schemas import UserLogin, Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.username)
    ).first()

    # For local demo ease, if password matches demo or user exists
    if not user:
        # Auto-create demo user if not existing
        user = User(
            username=payload.username,
            email=f"{payload.username}@celestialwear.in",
            hashed_password="demo_password",
            full_name=payload.username.title(),
            role="sales_rep",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(data={"sub": user.username, "role": user.role, "id": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name or user.username,
            "role": user.role
        }
    }

@router.get("/me")
def get_current_user_demo():
    return {
        "id": 1,
        "username": "salesrep",
        "email": "sales@celestialwear.in",
        "full_name": "Alex Turner",
        "role": "sales_rep"
    }
