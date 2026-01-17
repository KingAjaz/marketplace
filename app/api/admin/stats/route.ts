/**
export const dynamic = 'force-dynamic'
 * Admin Dashboard Stats API
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get stats - optimized with aggregation
    const [
      totalUsers,
      totalSellers,
      pendingSellerApprovals,
      totalOrders,
      pendingDisputes,
      revenueResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count({
        where: {
          role: 'SELLER',
          isActive: true,
          sellerStatus: 'APPROVED',
        },
      }),
      prisma.userRole.count({
        where: {
          role: 'SELLER',
          sellerStatus: 'PENDING',
        },
      }),
      prisma.order.count(),
      prisma.dispute.count({
        where: {
          status: {
            in: ['OPEN', 'IN_REVIEW'],
          },
        },
      }),
      // Use aggregation instead of fetching all records
      prisma.order.aggregate({
        where: {
          payment: {
            status: 'RELEASED',
          },
        },
        _sum: {
          platformFee: true,
        },
      }),
    ])

    const totalRevenue = revenueResult._sum.platformFee || 0

    return NextResponse.json(
      {
        totalUsers,
        totalSellers,
        pendingSellerApprovals,
        totalOrders,
        totalRevenue,
        pendingDisputes,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
