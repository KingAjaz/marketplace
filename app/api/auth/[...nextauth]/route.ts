import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

// Temporarily restored during migration to Supabase Auth
// This route is needed for middleware and API routes that still use NextAuth
// NOTE: NEXTAUTH_SECRET must be set in Vercel environment variables for this to work
// Once migration is complete, this route and NEXTAUTH_SECRET will be removed

// Provide a fallback secret for development/migration, but warn about it
// In production, this should always be set in environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.warn('[NextAuth] WARNING: NEXTAUTH_SECRET is not set. Using temporary secret for migration. Please set NEXTAUTH_SECRET in Vercel environment variables.')
  // Use a temporary secret to prevent Configuration errors during migration
  // This is NOT secure for production and should be replaced
  process.env.NEXTAUTH_SECRET = 'temp-migration-secret-change-me-in-production-' + Date.now()
}

let handler: any

try {
  handler = NextAuth(authOptions)
} catch (error: any) {
  console.error('[NextAuth] Failed to initialize:', error)
  // If initialization fails, redirect to error page
  handler = async (req: NextRequest) => {
    const baseUrl = process.env.NEXTAUTH_URL || req.headers.get('origin') || 'http://localhost:3000'
    return NextResponse.redirect(new URL('/auth/error?error=Configuration', baseUrl))
  }
}

export { handler as GET, handler as POST }
