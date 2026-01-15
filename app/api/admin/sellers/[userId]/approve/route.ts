/**
 * Approve Seller API
 * 
 * Approves a pending seller application.
 * Activates the seller role and shop.
 * 
 * Security:
 * - Requires admin role
 * - Validates seller exists and is pending
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

    // Update seller role to approved
    await prisma.userRole.update({
      where: { id: sellerRole.id },
      data: {
        sellerStatus: 'APPROVED',
        isActive: true,
        kycApproved: true,
        kycApprovedAt: new Date(),
      },
    })

    // Activate the shop
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

    console.log('[Admin] Seller approved:', {
      userId,
      approvedBy: session.user.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      message: 'Seller approved successfully',
      userId,
    })
  } catch (error: any) {
    console.error('Approve seller error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve seller' },
      { status: 500 }
    )
  }
}
