/**
 * Reject Seller Application API
 * 
 * Rejects a pending seller application with a reason.
 * 
 * Security:
 * - Requires admin role
 * - Validates seller exists and is pending
 * - Requires rejection reason
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
    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    // Find the seller role
    const sellerRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: 'SELLER',
      },
    })

    if (!sellerRole) {
      return NextResponse.json(
        { error: 'Seller application not found' },
        { status: 404 }
      )
    }

    if (sellerRole.sellerStatus !== 'PENDING') {
      return NextResponse.json(
        { error: `Seller application is already ${sellerRole.sellerStatus}` },
        { status: 400 }
      )
    }

    // Update seller role to rejected
    await prisma.userRole.update({
      where: { id: sellerRole.id },
      data: {
        sellerStatus: 'REJECTED',
        isActive: false,
        kycApproved: false,
        kycRejectedAt: new Date(),
        rejectionReason: reason.trim(),
      },
    })

    // Keep shop inactive (it's already inactive, but ensure it stays that way)
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

    console.log('[Admin] Seller rejected:', {
      userId,
      rejectedBy: session.user.id,
      reason: reason.trim(),
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      message: 'Seller application rejected',
      userId,
    })
  } catch (error: any) {
    console.error('Reject seller error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject seller' },
      { status: 500 }
    )
  }
}
