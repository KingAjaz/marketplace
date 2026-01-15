/**
 * Middleware for route protection and role-based access
 */
import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { RoleType } from '@prisma/client'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // If user is not authenticated, allow access to public routes
    if (!token) {
      if (path.startsWith('/api/auth')) {
        return NextResponse.next()
      }
      if (path.startsWith('/auth') || path === '/' || path.startsWith('/market')) {
        return NextResponse.next()
      }
      return NextResponse.redirect(new URL('/auth/signin', req.url))
    }

    // If user is authenticated, redirect away from auth pages (except complete-profile and verify-email)
    if (token && path.startsWith('/auth')) {
      // Allow access to complete-profile if phone number is missing
      if (path.startsWith('/auth/complete-profile')) {
        return NextResponse.next()
      }
      // Allow access to verify-email if email is not verified
      if (path.startsWith('/auth/verify-email')) {
        return NextResponse.next()
      }
      // Allow access to reset-password (for password reset flow)
      if (path.startsWith('/auth/reset-password')) {
        return NextResponse.next()
      }
      // Redirect authenticated users away from signin/signup/forgot-password
      if (
        path.startsWith('/auth/signin') ||
        path.startsWith('/auth/signup') ||
        path.startsWith('/auth/forgot-password')
      ) {
        // Redirect to home or callback URL
        const callbackUrl = req.nextUrl.searchParams.get('callbackUrl') || '/'
        return NextResponse.redirect(new URL(callbackUrl, req.url))
      }
    }

    // Check if user has completed profile (phone number required)
    // Phone number is mandatory for placing orders, accessing seller features, etc.
    // Allow access to profile completion page, auth APIs, and application pages
    if (!token.phoneNumber && !path.startsWith('/auth/complete-profile') && !path.startsWith('/api/auth')) {
      // Block access to protected features until profile is complete
      // But allow seller/rider application pages (they will check and redirect if needed)
      if (
        path.startsWith('/cart') ||
        path.startsWith('/checkout') ||
        (path.startsWith('/seller') && !path.startsWith('/seller/apply')) ||
        (path.startsWith('/rider') && !path.startsWith('/rider/apply')) ||
        path.startsWith('/orders')
      ) {
        return NextResponse.redirect(new URL('/auth/complete-profile', req.url))
      }
      // Allow browsing market and application pages
    }

    // Check email verification for sensitive actions
    // Block payments, seller features, and order placement until email is verified
    // Allow email verification page and resend verification
    const emailVerified = token.emailVerified as Date | null
    if (!emailVerified && !path.startsWith('/auth/verify-email') && !path.startsWith('/api/auth/verify-email')) {
      if (
        path.startsWith('/checkout') ||
        path.startsWith('/api/orders') ||
        (path.startsWith('/seller') && !path.startsWith('/seller/apply')) ||
        path.startsWith('/api/admin/payments')
      ) {
        return NextResponse.redirect(new URL('/auth/verify-email?unverified=true', req.url))
      }
    }

    // Role-based access control
    const roles = (token.roles || []) as RoleType[]

    // Admin routes
    if (path.startsWith('/admin')) {
      if (!roles.includes('ADMIN')) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Seller routes (except application page)
    if (path.startsWith('/seller') && !path.startsWith('/seller/apply')) {
      if (!roles.includes('SELLER')) {
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    // Rider routes (except application page)
    // Note: If user was just approved, they may need to refresh their session or sign out/in
    // The dashboard page will handle session refresh and redirect appropriately
    if (path.startsWith('/rider') && !path.startsWith('/rider/apply')) {
      if (!roles.includes('RIDER')) {
        // Allow access to dashboard - it will check and refresh session client-side
        // For other rider routes, redirect to unauthorized if not in session
        if (path === '/rider/dashboard') {
          // Dashboard will handle session refresh and redirect
          return NextResponse.next()
        }
        return NextResponse.redirect(new URL('/unauthorized', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public routes
        const path = req.nextUrl.pathname
        if (
          path.startsWith('/auth') ||
          path === '/' ||
          path.startsWith('/market') ||
          path.startsWith('/api/auth')
        ) {
          return true
        }
        return !!token
      },
    },
  }
)

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
