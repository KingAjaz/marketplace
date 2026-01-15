/**
 * Seller Application Status API
 * 
 * Returns the current status of user's seller application
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sellerRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
      },
    })

    if (!sellerRole) {
      return NextResponse.json({
        status: 'none',
      })
    }

    return NextResponse.json({
      status: sellerRole.sellerStatus?.toLowerCase() || 'none',
      kycSubmitted: sellerRole.kycSubmitted,
      kycApproved: sellerRole.kycApproved,
      rejectionReason: sellerRole.rejectionReason,
    })
  } catch (error) {
    console.error('Get application status error:', error)
    return NextResponse.json(
      { error: 'Failed to get application status' },
      { status: 500 }
    )
  }
}
