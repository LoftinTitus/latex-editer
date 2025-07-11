// Supabase configuration for frontend
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth helper functions for frontend
const authHelpers = {
  // Sign up with email and password
  signUp: async (email, password, metadata = {}) => {
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

// Database helper functions
const dbHelpers = {
  // Save a LaTeX document
  saveDocument: async (title, content, userId) => {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .insert([
          {
            title: title,
            content: content,
            user_id: userId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Save document error:', error.message);
      throw error;
    }
  },

  // Update a LaTeX document
  updateDocument: async (documentId, title, content) => {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .update({
          title: title,
          content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      console.error('Update document error:', error.message);
      throw error;
    }
  },

  // Get user's documents
  getUserDocuments: async (userId) => {
    try {
      const { data, error } = await supabaseClient
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Get user documents error:', error.message);
      throw error;
    }
  },

  // Delete a document
  deleteDocument: async (documentId) => {
    try {
      const { error } = await supabaseClient
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete document error:', error.message);
      throw error;
    }
  }
};

// Utility functions
const utils = {
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
