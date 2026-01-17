/**
 * OAuth Callback Handler
 * 
 * Handles OAuth callbacks from Supabase Auth (Google, etc.)
 */
import { createClient } from '@/lib/supabase/server'
import { syncUserWithPrisma } from '@/lib/auth-supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('OAuth callback error:', error)
      return NextResponse.redirect(
        new URL(`/auth/signin?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    // Sync user with Prisma if authenticated
    if (data.user) {
      try {
        await syncUserWithPrisma(
          data.user.id,
          data.user.email!,
          data.user.user_metadata
        )
      } catch (syncError) {
        console.error('Error syncing user with Prisma:', syncError)
        // Continue even if sync fails - user is still authenticated
      }
    }

    // Redirect to complete profile if phone number is missing, otherwise to next URL
    const redirectUrl = data.user?.user_metadata?.phone_number 
      ? next 
      : '/auth/complete-profile'
    
    return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin))
  }

  // If no code, redirect to signin
  return NextResponse.redirect(new URL('/auth/signin', requestUrl.origin))
}
