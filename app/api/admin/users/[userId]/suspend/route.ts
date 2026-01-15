/**
 * Admin User Suspend/Unsuspend API
 * 
 * POST: Suspend or unsuspend a user by deactivating/reactivating their roles
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { userId } = await params
    const { action, reason } = await request.json() // action: 'suspend' | 'unsuspend'

    if (!action || !['suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "suspend" or "unsuspend"' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent suspending admin users (security)
    const isAdmin = user.roles.some((r) => r.role === 'ADMIN' && r.isActive)
    if (isAdmin && action === 'suspend') {
      return NextResponse.json(
        { error: 'Cannot suspend admin users' },
        { status: 403 }
      )
    }

    // Prevent suspending yourself
    if (userId === session.user.id && action === 'suspend') {
      return NextResponse.json(
        { error: 'Cannot suspend your own account' },
        { status: 403 }
      )
    }

    if (action === 'suspend') {
      // Deactivate all user roles
      await prisma.userRole.updateMany({
        where: {
          userId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })

      // Also deactivate shop if user is a seller
      const sellerRole = user.roles.find((r) => r.role === 'SELLER')
      if (sellerRole) {
        const shop = await prisma.shop.findUnique({
          where: { userId },
        })
        if (shop) {
          await prisma.shop.update({
            where: { id: shop.id },
            data: {
              isActive: false,
            },
          })
        }
      }

      console.log('[Admin] User suspended:', {
        userId,
        suspendedBy: session.user.id,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        message: 'User suspended successfully',
        userId,
      })
    } else {
      // Unsuspend: Reactivate roles
      await prisma.userRole.updateMany({
        where: {
          userId,
        },
        data: {
          isActive: true,
        },
      })

      // Reactivate shop if user is a seller (only if they were approved)
      const sellerRole = user.roles.find((r) => r.role === 'SELLER')
      if (sellerRole && sellerRole.sellerStatus === 'APPROVED') {
        const shop = await prisma.shop.findUnique({
          where: { userId },
        })
        if (shop) {
          await prisma.shop.update({
            where: { id: shop.id },
            data: {
              isActive: true,
            },
          })
        }
      }

      console.log('[Admin] User unsuspended:', {
        userId,
        unsuspendedBy: session.user.id,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        message: 'User unsuspended successfully',
        userId,
      })
    }
  } catch (error: any) {
    console.error('Suspend/unsuspend user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update user status' },
      { status: 500 }
    )
  }
}
