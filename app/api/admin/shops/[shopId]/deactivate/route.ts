/**
 * Admin Shop Deactivate/Activate API
 * 
 * POST: Deactivate or activate a shop
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
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

    const { shopId } = await params
    const { action, reason } = await request.json() // action: 'deactivate' | 'activate'

    if (!action || !['deactivate', 'activate'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "deactivate" or "activate"' },
        { status: 400 }
      )
    }

    // Check if shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        user: {
          include: {
            roles: {
              where: {
                role: 'SELLER',
              },
            },
          },
        },
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    if (action === 'deactivate') {
      // Deactivate shop
      await prisma.shop.update({
        where: { id: shopId },
        data: {
          isActive: false,
        },
      })

      // Also deactivate seller role if needed
      const sellerRole = shop.user.roles[0]
      if (sellerRole && sellerRole.isActive) {
        await prisma.userRole.update({
          where: { id: sellerRole.id },
          data: {
            isActive: false,
          },
        })
      }

      console.log('[Admin] Shop deactivated:', {
        shopId,
        shopName: shop.name,
        deactivatedBy: session.user.id,
        reason: reason || 'No reason provided',
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        message: 'Shop deactivated successfully',
        shopId,
      })
    } else {
      // Activate shop (only if seller is approved)
      const sellerRole = shop.user.roles[0]
      if (sellerRole && sellerRole.sellerStatus !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Cannot activate shop for non-approved seller' },
          { status: 400 }
        )
      }

      await prisma.shop.update({
        where: { id: shopId },
        data: {
          isActive: true,
        },
      })

      // Also activate seller role if it exists
      if (sellerRole && !sellerRole.isActive) {
        await prisma.userRole.update({
          where: { id: sellerRole.id },
          data: {
            isActive: true,
          },
        })
      }

      console.log('[Admin] Shop activated:', {
        shopId,
        shopName: shop.name,
        activatedBy: session.user.id,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        message: 'Shop activated successfully',
        shopId,
      })
    }
  } catch (error: any) {
    console.error('Deactivate/activate shop error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update shop status' },
      { status: 500 }
    )
  }
}
