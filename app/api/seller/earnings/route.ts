/**
export const dynamic = 'force-dynamic'
 * Seller Earnings Report API
 * 
 * GET: Get detailed earnings breakdown for seller
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
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const period = parseInt(searchParams.get('period') || '30') // days
    const breakdownBy = searchParams.get('breakdownBy') || 'day' // day, week, month

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Get all orders with released payments
    const orders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        payment: {
          status: 'RELEASED',
          releasedAt: {
            not: null,
          },
        },
      },
      include: {
        payment: {
          select: {
            releasedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Calculate summary
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)
    const totalPlatformFees = orders.reduce((sum, order) => sum + order.platformFee, 0)
    const netEarnings = totalRevenue - totalPlatformFees
    const totalOrders = orders.length
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Group by period
    const breakdownMap = new Map<string, typeof orders>()

    orders.forEach(order => {
      const paymentDate = order.payment?.releasedAt || order.createdAt
      let key: string

      if (breakdownBy === 'day') {
        key = paymentDate.toISOString().split('T')[0] // YYYY-MM-DD
      } else if (breakdownBy === 'week') {
        const weekStart = new Date(paymentDate)
        weekStart.setDate(paymentDate.getDate() - paymentDate.getDay())
        key = `Week of ${weekStart.toISOString().split('T')[0]}`
      } else { // month
        key = paymentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }

      if (!breakdownMap.has(key)) {
        breakdownMap.set(key, [])
      }
      breakdownMap.get(key)!.push(order)
    })

    // Create breakdown array
    const breakdown = Array.from(breakdownMap.entries())
      .map(([date, periodOrders]) => {
        const revenue = periodOrders.reduce((sum, o) => sum + o.total, 0)
        const platformFee = periodOrders.reduce((sum, o) => sum + o.platformFee, 0)
        const netEarnings = revenue - platformFee

        return {
          date,
          revenue: Math.round(revenue * 100) / 100,
          platformFee: Math.round(platformFee * 100) / 100,
          netEarnings: Math.round(netEarnings * 100) / 100,
          orderCount: periodOrders.length,
          orders: periodOrders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            total: Math.round(order.total * 100) / 100,
            platformFee: Math.round(order.platformFee * 100) / 100,
            netAmount: Math.round((order.total - order.platformFee) * 100) / 100,
            status: order.status,
            createdAt: order.createdAt.toISOString(),
            releasedAt: order.payment?.releasedAt?.toISOString() || null,
          })),
        }
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalPlatformFees: Math.round(totalPlatformFees * 100) / 100,
        netEarnings: Math.round(netEarnings * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
      },
      breakdown,
    })
  } catch (error: any) {
    console.error('Seller earnings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
