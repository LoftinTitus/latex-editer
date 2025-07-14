// Supabase configuration for frontend
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client with error handling
let supabaseClient = null;
try {
  const { createClient } = supabase;
  if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn('Supabase configuration not set. Authentication features will be disabled.');
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
}

// Auth helper functions for frontend
const authHelpers = {
  // Sign up with email and password
  signUp: async (email, password, metadata = {}) => {
    if (!supabaseClient) {
      throw new Error('Supabase not configured. Authentication unavailable.');
    }
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign up error:', error.message);
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    if (!supabaseClient) {
      throw new Error('Supabase not configured. Authentication unavailable.');
    }
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Sign in error:', error.message);
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Sign out error:', error.message);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabaseClient.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get current user error:', error.message);
      return null;
    }
  },

  // Get current session
  getCurrentSession: async () => {
    if (!supabaseClient) {
      return null;
    }
    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get current session error:', error.message);
      return null;
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    if (!supabaseClient) {
      // Return a no-op function when Supabase isn't configured
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabaseClient.auth.onAuthStateChange(callback);
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      });
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Reset password error:', error.message);
      throw error;
    }
  }
};

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const session = await authHelpers.getCurrentSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };
};

// Database helper functions - Updated to use backend API
const dbHelpers = {
  // Save a LaTeX note
  saveNote: async (title, content, latexContent = null) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${window.API_BASE_URL}/notes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title,
          content: content,
          latex_content: latexContent
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save note');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Save note error:', error.message);
      throw error;
    }
  },

  // Update a LaTeX note
  updateNote: async (noteId, title, content, latexContent = null) => {
    try {
      const headers = await getAuthHeaders();
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) updateData.content = content;
      if (latexContent !== undefined) updateData.latex_content = latexContent;
      
      const response = await fetch(`${window.API_BASE_URL}/notes/${noteId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update note');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update note error:', error.message);
      throw error;
    }
  },

  // Get user's notes
  getUserNotes: async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${window.API_BASE_URL}/notes`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch notes');
      }
      
      const result = await response.json();
      return result.notes;
    } catch (error) {
      console.error('Get user notes error:', error.message);
      throw error;
    }
  },

  // Get a specific note
  getNote: async (noteId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${window.API_BASE_URL}/notes/${noteId}`, {
        method: 'GET',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch note');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get note error:', error.message);
      throw error;
    }
  },

  // Delete a note
  deleteNote: async (noteId) => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${window.API_BASE_URL}/notes/${noteId}`, {
        method: 'DELETE',
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete note');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete note error:', error.message);
      throw error;
    }
  },

  // Legacy document functions for backward compatibility
  saveDocument: async (title, content, userId) => {
    return await dbHelpers.saveNote(title, content);
  },

  updateDocument: async (documentId, title, content) => {
    return await dbHelpers.updateNote(documentId, title, content);
  },

  getUserDocuments: async (userId) => {
    return await dbHelpers.getUserNotes();
  },

  deleteDocument: async (documentId) => {
    return await dbHelpers.deleteNote(documentId);
  }
};

// Utility functions
const supabaseUtils = {
  // Debounce function for auto-save
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format date for display
  formatDate: (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // Generate title from LaTeX content
  generateTitle: (content) => {
    // Look for \title{} command
    const titleMatch = content.match(/\\title\{([^}]+)\}/);
    if (titleMatch) {
      return titleMatch[1];
    }

    // Look for first section
    const sectionMatch = content.match(/\\section\{([^}]+)\}/);
    if (sectionMatch) {
      return sectionMatch[1];
    }

    // Look for first subsection
    const subsectionMatch = content.match(/\\subsection\{([^}]+)\}/);
    if (subsectionMatch) {
      return subsectionMatch[1];
    }

    // Default title based on date
    return `Document ${new Date().toLocaleDateString()}`;
  }
};

// Export for use in other scripts
window.supabaseClient = supabaseClient;
window.authHelpers = authHelpers;
window.dbHelpers = dbHelpers;
window.utils = utils;
