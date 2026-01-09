"""
Authentication middleware and utilities
Compatible with NextAuth JWT tokens
"""

from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from typing import Optional
import os
from app.core.database import get_supabase
import logging

logger = logging.getLogger(__name__)

# JWT secret (should match NextAuth secret)
JWT_SECRET = os.getenv("NEXTAUTH_SECRET") or os.getenv("JWT_SECRET", "")
ALGORITHM = "HS256"

security = HTTPBearer()


class CurrentUser:
    """Current authenticated user"""
    def __init__(self, user_id: str, email: str, role: str, name: str):
        self.id = user_id
        self.email = email
        self.role = role
        self.name = name


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """
    Get current authenticated user from JWT token
    Compatible with NextAuth JWT tokens
    """
    token = credentials.credentials
    
    try:
        # Decode JWT token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        
        user_id = payload.get("sub") or payload.get("id")
        email = payload.get("email")
        role = payload.get("role")
        name = payload.get("name")
        
        if not user_id or not email or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload"
            )
        
        return CurrentUser(user_id, email, role, name)
    
    except JWTError as e:
        logger.error(f"JWT decode error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )


def require_role(allowed_roles: list[str]):
    """
    Dependency to require specific role(s)
    Usage: user: CurrentUser = Depends(require_role(["teacher", "admin"]))
    """
    def role_checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_roles)}"
            )
        return user
    
    return role_checker


# Convenience dependencies
require_student = require_role(["student"])
require_teacher = require_role(["teacher"])
require_admin = require_role(["admin"])
require_principal = require_role(["principal"])
require_admin_or_principal = require_role(["admin", "principal"])

