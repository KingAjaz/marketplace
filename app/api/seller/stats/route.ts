/**
export const dynamic = 'force-dynamic'
 * Seller Dashboard Stats API
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

    // Check if user has seller role
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: true,
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'Seller role not found' },
        { status: 403 }
      )
    }

    // Get user's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
      })
    }

    // Get stats
    const [totalProducts, totalOrders, pendingOrders, completedPayments] = await Promise.all([
      prisma.product.count({
        where: { shopId: shop.id },
      }),
      prisma.order.count({
        where: { shopId: shop.id },
      }),
      prisma.order.count({
        where: {
          shopId: shop.id,
          status: {
            in: ['PAID', 'PREPARING', 'OUT_FOR_DELIVERY'],
          },
        },
      }),
      prisma.payment.findMany({
        where: {
          order: {
            shopId: shop.id,
          },
          status: 'RELEASED',
        },
        select: {
          amount: true,
        },
      }),
    ])

    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      totalProducts,
      totalOrders,
      totalRevenue,
      pendingOrders,
    })
  } catch (error) {
    console.error('Seller stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
