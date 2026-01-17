/**
 * Supabase Auth Hook
 * 
 * Replacement for useSession() from next-auth/react
 * Provides user session data from Supabase Auth
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  name?: string | null
  image?: string | null
  phoneNumber?: string | null
  emailVerified?: Date | null
  roles?: string[]
}

interface UseAuthReturn {
  user: User | null
  session: any | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  loading: boolean
  refetch: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<any | null>(null)
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchUser = async () => {
    try {
      setLoading(true)
      
      // Get Supabase session
      const { data: { session: supabaseSession }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !supabaseSession) {
        setSession(null)
        setUser(null)
        setStatus('unauthenticated')
        setLoading(false)
        return
      }

      setSession(supabaseSession)

      // Fetch user profile from our API
      const response = await fetch('/api/auth/profile')
      
      if (!response.ok) {
        if (response.status === 401) {
          setUser(null)
          setStatus('unauthenticated')
          setLoading(false)
          return
        }
        // For other errors, still try to use Supabase user data
        const supabaseUser = supabaseSession.user
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          image: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          phoneNumber: null,
          emailVerified: supabaseUser.email_confirmed_at ? new Date(supabaseUser.email_confirmed_at) : null,
          roles: [],
        })
        setStatus('authenticated')
        setLoading(false)
        return
      }

      const userData = await response.json()
      setUser(userData)
      setStatus('authenticated')
    } catch (error: any) {
      console.error('Error fetching user:', error)
      setUser(null)
      setStatus('unauthenticated')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUser()
      } else {
        setSession(null)
        setUser(null)
        setStatus('unauthenticated')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    user,
    session,
    status,
    loading,
    refetch: fetchUser,
  }
}
