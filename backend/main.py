from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from datetime import datetime
import logging
import os
from dotenv import load_dotenv

from compiler import compile_latex_to_pdf, LaTeXCompilationError
from auth import get_current_user, get_optional_user, require_verified_email, AuthMiddleware

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class LaTeXCompileRequest(BaseModel):
    latex_content: str
    
class LaTeXCompileResponse(BaseModel):
    success: bool
    message: str
    pdf_size: int = 0

class UserInfo(BaseModel):
    id: str
    email: str
    role: str = "authenticated"

# Initialize FastAPI app
app = FastAPI(
    title="LaTeX Note App API",
    description="A lightweight web application for writing LaTeX code, compiling to PDF, and managing notes",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add authentication middleware
app.add_middleware(AuthMiddleware)

@app.get("/")
async def health_check():
    """
    Health check endpoint to verify the API is running
    """
    return {
        "status": "healthy",
        "message": "LaTeX Note App API is running",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health")
async def health():
    """
    Alternative health check endpoint
    """
    return {"status": "ok"}

@app.get("/auth/me", response_model=UserInfo)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user information
    """
    return UserInfo(
        id=current_user["id"],
        email=current_user["email"],
        role=current_user.get("role", "authenticated")
    )

@app.get("/auth/status")
async def auth_status(request: Request):
    """
    Check authentication status (optional auth)
    """
    user = get_optional_user(request)
    return {
        "authenticated": user is not None,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user.get("role", "authenticated")
        } if user else None
    }

@app.post("/compile", response_model=LaTeXCompileResponse)
async def compile_latex(
    request: LaTeXCompileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Compile LaTeX content to PDF and return success status (requires authentication)
    """
    try:
        logger.info(f"User {current_user['email']} (ID: {current_user['id']}) compiling LaTeX")
        pdf_bytes = compile_latex_to_pdf(request.latex_content)
        return LaTeXCompileResponse(
            success=True,
            message="LaTeX compiled successfully",
            pdf_size=len(pdf_bytes)
        )
    except LaTeXCompilationError as e:
        logger.error(f"LaTeX compilation failed for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during compilation for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during compilation")

@app.post("/compile/pdf")
async def compile_latex_to_pdf_endpoint(
    request: LaTeXCompileRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Compile LaTeX content to PDF and return the PDF file directly (requires authentication)
    """
    try:
        logger.info(f"User {current_user['email']} (ID: {current_user['id']}) compiling LaTeX to PDF")
        pdf_bytes = compile_latex_to_pdf(request.latex_content)
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "inline; filename=document.pdf",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except LaTeXCompilationError as e:
        logger.error(f"LaTeX compilation failed for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during compilation for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during compilation")

@app.get("/compiler/status")
async def get_compiler_status():
    """
    Check the status of available LaTeX compilers
    """
    try:
        from compiler import LaTeXCompiler
        compiler = LaTeXCompiler()
        return {
            "tectonic_available": compiler.tectonic_available,
            "pdflatex_available": compiler.pdflatex_available,
            "status": "ready" if (compiler.tectonic_available or compiler.pdflatex_available) else "no_compilers",
            "message": "LaTeX compilation is ready" if (compiler.tectonic_available or compiler.pdflatex_available) 
                      else "No LaTeX compilers found. Please install Tectonic or pdflatex."
        }
    except RuntimeError as e:
        return {
            "tectonic_available": False,
            "pdflatex_available": False,
            "status": "error",
            "message": str(e),
            "installation_help": {
                "tectonic": "brew install tectonic (recommended)",
                "pdflatex": "brew install --cask mactex"
            }
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
