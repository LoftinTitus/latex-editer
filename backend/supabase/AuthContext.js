import React, { createContext, useContext, useEffect, useState } from 'react'
import { auth, utils } from './supabase'

// Create auth context
const AuthContext = createContext({})

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const initialSession = await auth.getCurrentSession()
        setSession(initialSession)
        setUser(initialSession?.user || null)
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Auth methods
  const signUp = async (email, password, metadata = {}) => {
    setLoading(true)
    try {
      const result = await auth.signUp(email, password, metadata)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const result = await auth.signIn(email, password)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signInWithProvider = async (provider) => {
    setLoading(true)
    try {
      const result = await auth.signInWithProvider(provider)
      return result
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      await auth.signOut()
      setUser(null)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    return await auth.resetPassword(email)
  }

  const updatePassword = async (newPassword) => {
    return await auth.updatePassword(newPassword)
  }

  const updateUser = async (attributes) => {
    return await auth.updateUser(attributes)
  }

  // Utility methods
  const getAccessToken = async () => {
    return await utils.getAccessToken()
  }

  const isAuthenticated = () => {
    return !!session
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    updateUser,
    getAccessToken,
    isAuthenticated
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Higher-order component for protected routes
export const withAuth = (WrappedComponent) => {
  return function AuthenticatedComponent(props) {
    const { user, loading } = useAuth()

    if (loading) {
      return <div>Loading...</div>
    }

    if (!user) {
      return <div>Please sign in to access this page.</div>
    }

    return <WrappedComponent {...props} />
  }
}

// Hook for making authenticated API calls
export const useAuthenticatedFetch = () => {
  const { getAccessToken } = useAuth()

  const authenticatedFetch = async (url, options = {}) => {
    const token = await getAccessToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return fetch(url, {
      ...options,
      headers,
    })
  }

  return authenticatedFetch
}

export default AuthContext
