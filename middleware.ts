/**
 * Middleware for route protection and role-based access
 * Using Supabase Auth instead of NextAuth
 */
import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, NextRequest } from 'next/server'
import { RoleType } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth-supabase'

export async function middleware(request: NextRequest) {
  // First, update Supabase session (handles auth state)
  const supabaseResponse = await updateSession(request)
  const path = request.nextUrl.pathname

  // Skip auth checks for public routes
  if (
    path.startsWith('/auth') ||
    path === '/' ||
    path.startsWith('/market') ||
    path.startsWith('/api/auth') ||
    path.startsWith('/_next') ||
    path.startsWith('/api/places') ||
    path.startsWith('/api/products') && path === '/api/products' ||
    path.startsWith('/api/shops') && path === '/api/shops'
  ) {
    return supabaseResponse
  }

  // For protected routes, check if user is authenticated and get their data
  const user = await getCurrentUser()

  // If user is not authenticated, redirect to signin
  if (!user) {
    if (path.startsWith('/api')) {
      // API routes return 401 instead of redirecting
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // If user is authenticated, redirect away from auth pages (except complete-profile and verify-email)
  if (user && path.startsWith('/auth')) {
    // Allow access to complete-profile if phone number is missing
    if (path.startsWith('/auth/complete-profile')) {
      return supabaseResponse
    }
    // Allow access to verify-email if email is not verified
    if (path.startsWith('/auth/verify-email')) {
      return supabaseResponse
    }
    // Allow access to reset-password (for password reset flow)
    if (path.startsWith('/auth/reset-password')) {
      return supabaseResponse
    }
    // Redirect authenticated users away from signin/signup/forgot-password
    if (
      path.startsWith('/auth/signin') ||
      path.startsWith('/auth/signup') ||
      path.startsWith('/auth/forgot-password')
    ) {
      // Redirect to home or callback URL
      const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/'
      return NextResponse.redirect(new URL(callbackUrl, request.url))
    }
  }

  // Check if user has completed profile (phone number required)
  // Phone number is mandatory for placing orders, accessing seller features, etc.
  // Allow access to profile completion page, auth APIs, and application pages
  if (!user.phoneNumber && !path.startsWith('/auth/complete-profile') && !path.startsWith('/api/auth')) {
    // Block access to protected features until profile is complete
    // But allow seller/rider application pages (they will check and redirect if needed)
    if (
      path.startsWith('/cart') ||
      path.startsWith('/checkout') ||
      (path.startsWith('/seller') && !path.startsWith('/seller/apply')) ||
      (path.startsWith('/rider') && !path.startsWith('/rider/apply')) ||
      path.startsWith('/orders')
    ) {
      return NextResponse.redirect(new URL('/auth/complete-profile', request.url))
    }
    // Allow browsing market and application pages
  }

  // Check email verification for sensitive actions
  // Block payments, seller features, and order placement until email is verified
  // Allow email verification page and resend verification
  if (!user.emailVerified && !path.startsWith('/auth/verify-email') && !path.startsWith('/api/auth/verify-email')) {
    if (
      path.startsWith('/checkout') ||
      path.startsWith('/api/orders') ||
      (path.startsWith('/seller') && !path.startsWith('/seller/apply')) ||
      path.startsWith('/api/admin/payments')
    ) {
      return NextResponse.redirect(new URL('/auth/verify-email?unverified=true', request.url))
    }
  }

  // Role-based access control
  const roles = user.roles || []

  // Admin routes
  if (path.startsWith('/admin')) {
    if (!roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Seller routes (except application page)
  if (path.startsWith('/seller') && !path.startsWith('/seller/apply')) {
    if (!roles.includes('SELLER')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // Rider routes (except application page)
  if (path.startsWith('/rider') && !path.startsWith('/rider/apply')) {
    if (!roles.includes('RIDER')) {
      // Allow access to dashboard - it will check and refresh session client-side
      // For other rider routes, redirect to unauthorized if not in session
      if (path === '/rider/dashboard') {
        // Dashboard will handle session refresh and redirect
        return supabaseResponse
      }
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
