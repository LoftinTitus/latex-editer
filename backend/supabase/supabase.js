import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helper functions
export const auth = {
  // Sign up with email and password
  signUp: async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })
      
      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign up error:', error.message)
      throw error
    }
  },

  // Sign in with email and password
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      return { user: data.user, session: data.session }
    } catch (error) {
      console.error('Sign in error:', error.message)
      throw error
    }
  },

  // Sign in with OAuth provider (Google, GitHub, etc.)
  signInWithProvider: async (provider) => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error(`Sign in with ${provider} error:`, error.message)
      throw error
    }
  },

  // Sign out
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      return true
    } catch (error) {
      console.error('Sign out error:', error.message)
      throw error
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      console.error('Get current user error:', error.message)
      return null
    }
  },

  // Get current session
  getCurrentSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      return session
    } catch (error) {
      console.error('Get current session error:', error.message)
      return null
    }
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Reset password
  resetPassword: async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
      return true
    } catch (error) {
      console.error('Reset password error:', error.message)
      throw error
    }
  },

  // Update password
  updatePassword: async (newPassword) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Update password error:', error.message)
      throw error
    }
  },

  // Update user metadata
  updateUser: async (attributes) => {
    try {
      const { data, error } = await supabase.auth.updateUser(attributes)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Update user error:', error.message)
      throw error
    }
  }
}

// Database helper functions
export const db = {
  // Generic select function
  select: (table, columns = '*') => {
    return supabase.from(table).select(columns)
  },

  // Generic insert function
  insert: (table, data) => {
    return supabase.from(table).insert(data)
  },

  // Generic update function
  update: (table, data) => {
    return supabase.from(table).update(data)
  },

  // Generic delete function
  delete: (table) => {
    return supabase.from(table).delete()
  },

  // Get user's data with RLS automatically applied
  getUserData: async (table, userId = null) => {
    try {
      const user = userId || (await auth.getCurrentUser())?.id
      if (!user) throw new Error('No authenticated user')

      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', user)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Get user data error:', error.message)
      throw error
    }
  }
}

// Storage helper functions
export const storage = {
  // Upload file
  upload: async (bucket, path, file, options = {}) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Upload error:', error.message)
      throw error
    }
  },

  // Download file
  download: async (bucket, path) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Download error:', error.message)
      throw error
    }
  },

  // Get public URL for file
  getPublicUrl: (bucket, path) => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Delete file
  remove: async (bucket, paths) => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .remove(paths)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Remove file error:', error.message)
      throw error
    }
  }
}

// Real-time subscriptions
export const realtime = {
  // Subscribe to table changes
  subscribe: (table, callback, filter = '*') => {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', 
        { event: filter, schema: 'public', table }, 
        callback
      )
      .subscribe()
  },

  // Subscribe to user-specific changes (with RLS)
  subscribeToUserData: async (table, callback, userId = null) => {
    const user = userId || (await auth.getCurrentUser())?.id
    if (!user) throw new Error('No authenticated user')

    return supabase
      .channel(`public:${table}:user_id=eq.${user}`)
      .on('postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table,
          filter: `user_id=eq.${user}`
        },
        callback
      )
      .subscribe()
  }
}

// Utility functions
export const utils = {
  // Check if user is authenticated
  isAuthenticated: async () => {
    const session = await auth.getCurrentSession()
    return !!session
  },

  // Get access token for API calls
  getAccessToken: async () => {
    const session = await auth.getCurrentSession()
    return session?.access_token || null
  },

  // Format Supabase error messages
  formatError: (error) => {
    if (error?.message) {
      return error.message
    }
    return 'An unexpected error occurred'
  }
}

export default supabase
