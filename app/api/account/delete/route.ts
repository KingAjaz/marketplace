/**
 * Delete Account API
 * 
 * Allows users to delete or deactivate their account
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for account deletion (sensitive operation)
    const { checkRateLimit, rateLimiters } = await import('@/lib/rate-limit')
    const rateLimitResult = await checkRateLimit(request, rateLimiters.sensitive, session.user.id)
    if (!rateLimitResult.success) {
      return rateLimitResult.response as NextResponse
    }

    const { password, confirmDelete } = await request.json()

    // Validate confirmation
    if (confirmDelete !== 'DELETE') {
      return NextResponse.json(
        { error: 'Please type DELETE to confirm account deletion' },
        { status: 400 }
      )
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        orders: {
          where: {
            status: {
              notIn: ['DELIVERED', 'CANCELLED'],
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has active orders
    if (user.orders.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete account with active orders. Please complete or cancel all pending orders first.',
        },
        { status: 400 }
      )
    }

    // Verify password for email/password users
    if (user.password) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required to delete account' },
          { status: 400 }
        )
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return NextResponse.json(
          { error: 'Password is incorrect' },
          { status: 400 }
        )
      }
    }

    // Delete user account (cascades to related records)
    await prisma.user.delete({
      where: { id: user.id },
    })

    return NextResponse.json({
      message: 'Account deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}
