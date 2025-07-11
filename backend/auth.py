import os
import jwt
import requests
from typing import Optional
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Security scheme for Bearer token
security = HTTPBearer()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

class SupabaseAuth:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_JWT_SECRET:
            raise ValueError("SUPABASE_URL and SUPABASE_JWT_SECRET environment variables are required")
        
        self.supabase_url = SUPABASE_URL
        self.jwt_secret = SUPABASE_JWT_SECRET
        self.service_key = SUPABASE_SERVICE_KEY
        self._jwks_cache = None
    
    def verify_jwt_token(self, token: str) -> dict:
        """
        Verify a Supabase JWT token and return the payload
        """
        try:
            # Decode the JWT token
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                audience="authenticated"
            )
            
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            raise HTTPException(status_code=401, detail="Invalid token")
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            raise HTTPException(status_code=401, detail="Token verification failed")
    
    def get_user_from_token(self, token: str) -> dict:
        """
        Extract user information from a valid JWT token
        """
        payload = self.verify_jwt_token(token)
        
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "aud": payload.get("aud"),
            "exp": payload.get("exp"),
            "iat": payload.get("iat"),
            "iss": payload.get("iss"),
            "user_metadata": payload.get("user_metadata", {}),
            "app_metadata": payload.get("app_metadata", {})
        }
    
    async def verify_user_with_supabase(self, token: str) -> dict:
        """
        Verify user with Supabase API (optional additional verification)
        """
        try:
            headers = {
                "Authorization": f"Bearer {token}",
                "apikey": self.service_key or ""
            }
            
            response = requests.get(
                f"{self.supabase_url}/auth/v1/user",
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=401, detail="User verification failed")
                
        except requests.RequestException as e:
            logger.error(f"Supabase API error: {str(e)}")
            raise HTTPException(status_code=503, detail="Authentication service unavailable")

# Initialize the auth instance
supabase_auth = SupabaseAuth()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    FastAPI dependency to get the current authenticated user
    """
    try:
        token = credentials.credentials
        user = supabase_auth.get_user_from_token(token)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

def get_optional_user(request: Request) -> Optional[dict]:
    """
    FastAPI dependency to get the current user if authenticated (optional)
    """
    try:
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return None
        
        token = auth_header.split(" ")[1]
        user = supabase_auth.get_user_from_token(token)
        return user
    except Exception:
        return None

def require_auth(f):
    """
    Decorator to require authentication for a route
    """
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        # This decorator can be used with regular functions
        # For FastAPI routes, prefer using the get_current_user dependency
        return await f(*args, **kwargs)
    return decorated_function

def require_role(required_role: str):
    """
    Dependency factory to require a specific role
    """
    def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role != required_role:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        return current_user
    return role_checker

def require_verified_email(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependency to require verified email
    """
    email_confirmed = current_user.get("email_confirmed_at")
    if not email_confirmed:
        raise HTTPException(
            status_code=403,
            detail="Email verification required"
        )
    return current_user

class AuthMiddleware:
    """
    Middleware class for request-level authentication handling
    """
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Skip auth for public endpoints
            public_paths = ["/", "/health", "/docs", "/redoc", "/openapi.json"]
            if request.url.path in public_paths:
                await self.app(scope, receive, send)
                return
            
            # Add user info to request state if authenticated
            try:
                user = get_optional_user(request)
                if user:
                    scope["user"] = user
            except Exception as e:
                logger.debug(f"Auth middleware warning: {str(e)}")
        
        await self.app(scope, receive, send)

# Utility functions
def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user ID from request state (set by middleware)
    """
    user = getattr(request.state, "user", None) or request.scope.get("user")
    return user.get("id") if user else None

def is_authenticated(request: Request) -> bool:
    """
    Check if the request is from an authenticated user
    """
    return get_user_id_from_request(request) is not None
