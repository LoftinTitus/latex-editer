# LaTeX Note App

## Project Overview

This project is a lightweight web application that allows users to write LaTeX code, compile it to PDF on the server, view and download the resulting PDF, and manage their LaTeX notes with user authentication. The app is designed to be simple, fast, and affordable, targeting students, researchers, and hobbyists.

The tech stack includes Alpine.js for the frontend, FastAPI (Python) for the backend, Supabase for authentication and data storage, Fly.io for backend hosting, and GitHub Pages for frontend hosting. The architecture prioritizes low cost or free usage where possible.

---

## Features

- Text editor with LaTeX syntax input using `<textarea>` enhanced with Alpine.js for reactive UI
- **LaTeX Autocomplete**: Smart autocomplete for LaTeX commands triggered by backslash (`\`) with dropdown suggestions
- Server-side LaTeX compilation to PDF using Tectonic
- Inline PDF preview within the browser using an iframe
- User registration and login with email/password via Supabase authentication
- Save, load, update, and delete notes stored in Supabase Postgres database
- Download compiled PDF documents
- Subscription-based payment integration for premium features

### LaTeX Autocomplete Features

- **Trigger**: Type `\` followed by letters to show autocomplete suggestions
- **Navigation**: Use arrow keys (↑/↓) to navigate suggestions
- **Selection**: Press Tab, Enter, or click to insert the selected command
- **Smart Positioning**: Automatically positions cursor inside braces for commands like `\frac{}{}`
- **Comprehensive Command Library**: Includes 100+ common LaTeX commands including:
  - Document structure (`\documentclass`, `\begin{document}`, etc.)
  - Sections (`\section{}`, `\subsection{}`, etc.)
  - Math environments and symbols (`\frac{}{}`, `\sum`, `\alpha`, etc.)
  - Text formatting (`\textbf{}`, `\emph{}`, etc.)
  - Common packages (`\usepackage{amsmath}`, etc.)

---

## Tech Stack

| Component      | Technology            | Purpose                              | Notes                     |
|----------------|-----------------------|------------------------------------|---------------------------|
| Frontend       | HTML + Alpine.js      | Reactive UI without heavy frameworks | Fully static, free hosting |
| Autocomplete   | Alpine.js + Custom JS | LaTeX command suggestions           | Lightweight, no external libraries |
| Backend        | Python + FastAPI      | API endpoints and LaTeX compilation | Host on Fly.io free tier   |
| LaTeX Compiler | Tectonic or pdflatex  | Compile `.tex` to `.pdf`             | Run in sandboxed subprocess|
| Auth & Storage | Supabase              | User authentication and notes storage | Free tier available        |
| Frontend Hosting | Cloudflare Pages or GitHub Pages | Host static frontend assets          | Free                      |
| Backend Hosting | Fly.io                | Host backend API                    | Free for low usage         |

---

## Architecture Overview

The application consists of the following components interacting as below:

- The user's browser runs the frontend Alpine.js application with a LaTeX editor.
- Users authenticate via Supabase using email and password.
- The frontend sends LaTeX code to the FastAPI backend for compilation.
- The backend compiles the code securely and returns the PDF.
- The frontend displays the PDF preview in an iframe.
- Notes are saved, loaded, and managed through Supabase’s Postgres database.

---

## Project Structure
```
notetex/
├── backend/
│   ├── main.py             # FastAPI application entry point
│   ├── compiler.py         # LaTeX compilation logic
│   ├── auth.py           # auth
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Docker container configuration for deployment
    └── supabase/
      └── supabase.js
├── frontend/
│   ├── index.html          # Main application page using Alpine.js
│   ├── login.html          # Login and signup page integrated with Supabase
│   └── assets/
│       ├── css/
│       └── js/

```

## Recent Updates

- ✅ **LaTeX Autocomplete Implementation**: Added intelligent autocomplete for LaTeX commands with dropdown suggestions, keyboard navigation, and smart cursor positioning.

## Future Improvements

- Real-time collaboration  
- Enhanced LaTeX autocomplete with context-aware suggestions and custom snippets
- Export/import project ZIP files  
- Offline support (PWA)  
- Subscription payment integration
- Syntax highlighting for LaTeX code
- Error highlighting and LaTeX syntax validation

© 2025 Automated Tutoring and Intelligence Techologies. All rights reserved.
