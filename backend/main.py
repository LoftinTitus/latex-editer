from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
import logging
import os
from dotenv import load_dotenv
from supabase import create_client, Client

from compiler import compile_latex_to_pdf, LaTeXCompilationError
from auth import get_current_user, get_optional_user, require_verified_email, AuthMiddleware

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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

class NoteCreate(BaseModel):
    title: str
    content: str
    latex_content: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    latex_content: Optional[str] = None

class NoteResponse(BaseModel):
    id: str
    title: str
    content: str
    latex_content: Optional[str] = None
    user_id: str
    created_at: datetime
    updated_at: datetime

class NotesListResponse(BaseModel):
    notes: List[NoteResponse]
    total: int

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

# Notes CRUD endpoints

@app.get("/notes", response_model=NotesListResponse)
async def get_notes(current_user: dict = Depends(get_current_user)):
    """
    Get all notes for the authenticated user
    """
    try:
        result = supabase.table("notes").select("*").eq("user_id", current_user["id"]).order("created_at", desc=True).execute()
        
        notes = [
            NoteResponse(
                id=note["id"],
                title=note["title"],
                content=note["content"],
                latex_content=note.get("latex_content"),
                user_id=note["user_id"],
                created_at=datetime.fromisoformat(note["created_at"].replace("Z", "+00:00")),
                updated_at=datetime.fromisoformat(note["updated_at"].replace("Z", "+00:00"))
            )
            for note in result.data
        ]
        
        return NotesListResponse(notes=notes, total=len(notes))
    
    except Exception as e:
        logger.error(f"Error fetching notes for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch notes")

@app.post("/notes", response_model=NoteResponse)
async def create_note(note_data: NoteCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new note for the authenticated user
    """
    try:
        # Prepare note data
        note_dict = {
            "title": note_data.title,
            "content": note_data.content,
            "latex_content": note_data.latex_content,
            "user_id": current_user["id"]
        }
        
        result = supabase.table("notes").insert(note_dict).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create note")
        
        created_note = result.data[0]
        
        return NoteResponse(
            id=created_note["id"],
            title=created_note["title"],
            content=created_note["content"],
            latex_content=created_note.get("latex_content"),
            user_id=created_note["user_id"],
            created_at=datetime.fromisoformat(created_note["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(created_note["updated_at"].replace("Z", "+00:00"))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating note for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create note")

@app.get("/notes/{note_id}", response_model=NoteResponse)
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get a specific note by ID (only if it belongs to the authenticated user)
    """
    try:
        result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", current_user["id"]).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Note not found")
        
        note = result.data[0]
        
        return NoteResponse(
            id=note["id"],
            title=note["title"],
            content=note["content"],
            latex_content=note.get("latex_content"),
            user_id=note["user_id"],
            created_at=datetime.fromisoformat(note["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(note["updated_at"].replace("Z", "+00:00"))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching note {note_id} for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch note")

@app.put("/notes/{note_id}", response_model=NoteResponse)
async def update_note(note_id: str, note_data: NoteUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update a specific note by ID (only if it belongs to the authenticated user)
    """
    try:
        # First check if the note exists and belongs to the user
        existing_result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", current_user["id"]).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Prepare update data (only include fields that are not None)
        update_dict = {}
        if note_data.title is not None:
            update_dict["title"] = note_data.title
        if note_data.content is not None:
            update_dict["content"] = note_data.content
        if note_data.latex_content is not None:
            update_dict["latex_content"] = note_data.latex_content
        
        if not update_dict:
            # No fields to update, return existing note
            note = existing_result.data[0]
        else:
            # Update the note
            result = supabase.table("notes").update(update_dict).eq("id", note_id).eq("user_id", current_user["id"]).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to update note")
            
            note = result.data[0]
        
        return NoteResponse(
            id=note["id"],
            title=note["title"],
            content=note["content"],
            latex_content=note.get("latex_content"),
            user_id=note["user_id"],
            created_at=datetime.fromisoformat(note["created_at"].replace("Z", "+00:00")),
            updated_at=datetime.fromisoformat(note["updated_at"].replace("Z", "+00:00"))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating note {note_id} for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update note")

@app.delete("/notes/{note_id}")
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a specific note by ID (only if it belongs to the authenticated user)
    """
    try:
        # First check if the note exists and belongs to the user
        existing_result = supabase.table("notes").select("id").eq("id", note_id).eq("user_id", current_user["id"]).execute()
        
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Note not found")
        
        # Delete the note
        result = supabase.table("notes").delete().eq("id", note_id).eq("user_id", current_user["id"]).execute()
        
        return {"message": "Note deleted successfully", "note_id": note_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting note {note_id} for user {current_user['email']}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete note")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
