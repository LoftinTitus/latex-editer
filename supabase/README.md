# Supabase Integration

This directory contains the Supabase integration for the LaTeX Editor application, providing authentication and database functionality.

## Files

- `supabase.js` - Main Supabase client configuration and helper functions
- `AuthContext.js` - React context and hooks for authentication state management

## Setup

### 1. Install Dependencies

For the frontend (JavaScript/React):
```bash
npm install @supabase/supabase-js
```

For the backend (Python):
```bash
pip install -r backend/requirements.txt
```

### 2. Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### Backend (.env)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Supabase Project Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your keys and URL
3. Set up Row Level Security (RLS) policies for your tables

## Usage

### Frontend (React)

#### Wrap your app with the AuthProvider:

```jsx
import { AuthProvider } from './supabase/AuthContext'

function App() {
  return (
    <AuthProvider>
      <YourAppComponents />
    </AuthProvider>
  )
}
```

#### Use authentication in components:

```jsx
import { useAuth } from './supabase/AuthContext'

function LoginForm() {
  const { signIn, signUp, user } = useAuth()
  
  const handleSignIn = async (email, password) => {
    try {
      await signIn(email, password)
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }
  
  // Component JSX...
}
```

#### Make authenticated API calls:

```jsx
import { useAuthenticatedFetch } from './supabase/AuthContext'

function CompileDocument() {
  const authenticatedFetch = useAuthenticatedFetch()
  
  const compileLatex = async (latexContent) => {
    const response = await authenticatedFetch('/api/compile', {
      method: 'POST',
      body: JSON.stringify({ latex_content: latexContent })
    })
    return response.json()
  }
}
```

#### Protect routes:

```jsx
import { withAuth } from './supabase/AuthContext'

const ProtectedComponent = withAuth(({ user }) => {
  return <div>Welcome, {user.email}!</div>
})
```

### Backend (FastAPI)

#### Protected endpoints:

```python
from fastapi import Depends
from auth import get_current_user

@app.post("/protected-endpoint")
async def protected_route(current_user: dict = Depends(get_current_user)):
    return {"message": f"Hello, {current_user['email']}!"}
```

#### Optional authentication:

```python
from fastapi import Request
from auth import get_optional_user

@app.get("/optional-auth")
async def optional_auth_route(request: Request):
    user = get_optional_user(request)
    if user:
        return {"message": f"Welcome back, {user['email']}!"}
    else:
        return {"message": "Hello, anonymous user!"}
```

## Available Functions

### Authentication (`auth` object)
- `signUp(email, password, metadata)` - Register new user
- `signIn(email, password)` - Sign in user
- `signInWithProvider(provider)` - OAuth sign in
- `signOut()` - Sign out user
- `getCurrentUser()` - Get current user
- `getCurrentSession()` - Get current session
- `resetPassword(email)` - Send reset password email
- `updatePassword(newPassword)` - Update user password
- `updateUser(attributes)` - Update user profile

### Database (`db` object)
- `select(table, columns)` - Select data
- `insert(table, data)` - Insert data
- `update(table, data)` - Update data
- `delete(table)` - Delete data
- `getUserData(table, userId)` - Get user-specific data

### Storage (`storage` object)
- `upload(bucket, path, file)` - Upload file
- `download(bucket, path)` - Download file
- `getPublicUrl(bucket, path)` - Get public URL
- `remove(bucket, paths)` - Delete files

### Real-time (`realtime` object)
- `subscribe(table, callback)` - Subscribe to table changes
- `subscribeToUserData(table, callback)` - Subscribe to user-specific changes

### Utilities (`utils` object)
- `isAuthenticated()` - Check if user is authenticated
- `getAccessToken()` - Get JWT access token
- `formatError(error)` - Format error messages

## Security Notes

1. **Environment Variables**: Never commit actual API keys to version control
2. **Row Level Security**: Enable RLS on all Supabase tables
3. **JWT Secret**: Keep your JWT secret secure and rotate it periodically
4. **CORS**: Configure appropriate CORS origins for production
5. **Token Validation**: The backend validates JWT tokens on protected routes

## Example Database Schema

```sql
-- Users table (handled by Supabase Auth)
-- LaTeX documents table
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);
```
