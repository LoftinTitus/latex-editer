# Notes API Documentation

This document describes the CRUD endpoints for managing notes in the LaTeX Note App.

## Authentication

All notes endpoints require authentication. Include the Bearer token in the Authorization header:

```
Authorization: Bearer <your-supabase-jwt-token>
```

## Endpoints

### GET /notes

Get all notes for the authenticated user.

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "title": "My Note Title",
      "content": "Note content here",
      "latex_content": "\\documentclass{article}...",
      "user_id": "uuid",
      "created_at": "2025-07-11T10:00:00Z",
      "updated_at": "2025-07-11T10:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /notes

Create a new note for the authenticated user.

**Request Body:**
```json
{
  "title": "My Note Title",
  "content": "Note content here",
  "latex_content": "\\documentclass{article}..." // Optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "My Note Title",
  "content": "Note content here",
  "latex_content": "\\documentclass{article}...",
  "user_id": "uuid",
  "created_at": "2025-07-11T10:00:00Z",
  "updated_at": "2025-07-11T10:00:00Z"
}
```

### GET /notes/{note_id}

Get a specific note by ID (only if it belongs to the authenticated user).

**Response:**
```json
{
  "id": "uuid",
  "title": "My Note Title",
  "content": "Note content here",
  "latex_content": "\\documentclass{article}...",
  "user_id": "uuid",
  "created_at": "2025-07-11T10:00:00Z",
  "updated_at": "2025-07-11T10:00:00Z"
}
```

### PUT /notes/{note_id}

Update a specific note by ID (only if it belongs to the authenticated user).

**Request Body:**
```json
{
  "title": "Updated Title", // Optional
  "content": "Updated content", // Optional
  "latex_content": "\\documentclass{article}..." // Optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  "content": "Updated content",
  "latex_content": "\\documentclass{article}...",
  "user_id": "uuid",
  "created_at": "2025-07-11T10:00:00Z",
  "updated_at": "2025-07-11T10:15:00Z"
}
```

### DELETE /notes/{note_id}

Delete a specific note by ID (only if it belongs to the authenticated user).

**Response:**
```json
{
  "message": "Note deleted successfully",
  "note_id": "uuid"
}
```

## Error Responses

All endpoints may return the following error responses:

- `401 Unauthorized`: Invalid or missing authentication token
- `403 Forbidden`: Email verification required or insufficient permissions
- `404 Not Found`: Note not found or doesn't belong to the user
- `500 Internal Server Error`: Server error

Example error response:
```json
{
  "detail": "Note not found"
}
```

## Database Setup

Before using the notes endpoints, you need to set up the database table. You can:

1. Run the SQL commands from `database_setup.sql` in your Supabase dashboard
2. Or run the Python setup script: `python setup_database.py`

The database setup includes:
- `notes` table with proper schema
- Row Level Security (RLS) policies to ensure users can only access their own notes
- Indexes for performance optimization
- Automatic `updated_at` timestamp updates

## Security

- All notes are protected by Row Level Security (RLS) policies
- Users can only access, create, update, and delete their own notes
- Authentication is required for all operations
- User ID is automatically extracted from the JWT token
