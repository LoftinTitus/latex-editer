# Frontend Setup Instructions

## Getting Started

1. **Update Supabase Configuration**
   - Open `assets/js/supabase-config.js`
   - Replace `YOUR_SUPABASE_URL` with your actual Supabase project URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your actual Supabase anonymous key

2. **Serve the Files**
   Since these are static HTML files, you can serve them using any static file server:
   
   ### Option 1: Python (if you have Python installed)
   ```bash
   cd frontend
   python -m http.server 8000
   ```
   Then visit http://localhost:8000
   
   ### Option 2: Node.js http-server
   ```bash
   npm install -g http-server
   cd frontend
   http-server -p 8000
   ```
   
   ### Option 3: VS Code Live Server Extension
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

3. **Backend Integration**
   Make sure your FastAPI backend is running on the correct port and update the API endpoints in the JavaScript files if needed.

## File Structure

```
frontend/
├── index.html              # Main LaTeX editor page
├── login.html              # Authentication page
└── assets/
    ├── css/
    │   └── editor.css       # Custom styles
    └── js/
        ├── supabase-config.js  # Supabase configuration
        ├── editor.js           # Main editor logic
        └── auth.js             # Authentication logic
```

## Features

### Main Editor (index.html)
- LaTeX text editor with syntax highlighting hints
- Real-time PDF compilation
- Document saving and loading (for authenticated users)
- Auto-save functionality
- Example LaTeX content
- Responsive design

### Authentication (login.html)
- Email/password login and signup
- Password reset functionality
- Email verification support
- Guest access option
- Modern, responsive UI

### JavaScript Components
- **supabase-config.js**: Supabase client setup and helper functions
- **editor.js**: Alpine.js component for the main editor
- **auth.js**: Alpine.js component for authentication

## Customization

### Styling
- Built with Tailwind CSS for rapid styling
- Custom CSS in `assets/css/editor.css` for additional styling
- Responsive design that works on mobile and desktop

### Functionality
- Easy to extend with additional LaTeX templates
- Modular JavaScript architecture
- Error handling and user feedback
- Accessibility considerations

## Security Notes

- Never commit your actual Supabase keys to version control
- Use environment variables in production
- Configure Row Level Security (RLS) in Supabase for the documents table
- Enable email confirmation for new users in Supabase settings

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses ES6+ features (modules, async/await)
