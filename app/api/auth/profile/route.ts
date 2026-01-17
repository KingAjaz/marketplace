/**
 * Get Current User Profile API
 * 
 * Returns the current authenticated user's profile from Prisma
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Get profile error:', error)
    // Log more details for debugging
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    })
    
    // Return more specific error responses
    if (error.message?.includes('Prisma') || error.code?.startsWith('P')) {
      return NextResponse.json(
        { 
          error: 'Database error',
          message: 'Failed to access user data',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 500 }
      )
    }
    
    if (error.message?.includes('Supabase') || error.message?.includes('session')) {
      return NextResponse.json(
        { 
          error: 'Authentication error',
          message: 'Failed to verify session',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get profile',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
