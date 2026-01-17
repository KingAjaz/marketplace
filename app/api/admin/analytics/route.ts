/**
 * Admin Analytics API
 * 
 * Provides platform-wide analytics data
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

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30' // days

    const days = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Revenue by month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const payments = await prisma.payment.findMany({
      where: {
        status: 'RELEASED',
        releasedAt: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        order: {
          select: {
            platformFee: true,
            createdAt: true,
          },
        },
      },
    })

    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthPayments = payments.filter((p) => {
        const paymentDate = p.releasedAt || p.order.createdAt
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
        return paymentMonth === monthKey
      })

      const revenue = monthPayments.reduce((sum, p) => sum + p.order.platformFee, 0)

      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(revenue * 100) / 100,
      }
    })

    // Orders by month
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    })

    const ordersByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthOrders = orders.filter((o) => {
        const orderMonth = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`
        return orderMonth === monthKey
      })

      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthOrders.length,
      }
    })

    // Top shops by revenue
    const shopPayments = await prisma.payment.findMany({
      where: {
        status: 'RELEASED',
        releasedAt: {
          gte: startDate,
        },
      },
      include: {
        order: {
          select: {
            shopId: true,
            total: true,
            platformFee: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    const shopRevenue = shopPayments.reduce((acc: any, p) => {
      const shopName = p.order.shop.name
      if (!acc[shopName]) {
        acc[shopName] = { name: shopName, revenue: 0, orders: 0 }
      }
      acc[shopName].revenue += (p.order.total - p.order.platformFee)
      acc[shopName].orders += 1
      return acc
    }, {})

    const topShops = Object.values(shopRevenue)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((s: any) => ({
        name: s.name,
        revenue: Math.round(s.revenue * 100) / 100,
        orders: s.orders,
      }))

    // User growth
    const users = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    })

    const usersByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthUsers = users.filter((u) => {
        const userMonth = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`
        return userMonth === monthKey
      })

      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        count: monthUsers.length,
      }
    })

    // Calculate metrics for the selected period
    const periodOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        payment: {
          where: {
            status: 'RELEASED',
          },
        },
      },
    })

    const totalOrders = periodOrders.length
    const totalRevenue = periodOrders.reduce((sum, order) => {
      return sum + order.platformFee
    }, 0)

    const totalOrderValue = periodOrders.reduce((sum, order) => {
      return sum + order.total
    }, 0)

    const averageOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0
    const platformFeeRate = totalOrderValue > 0 ? (totalRevenue / totalOrderValue) * 100 : 0

    // Get total counts
    const [totalUsers, totalSellers] = await Promise.all([
      prisma.user.count(),
      prisma.userRole.count({
        where: {
          role: 'SELLER',
          isActive: true,
          sellerStatus: 'APPROVED',
        },
      }),
    ])

    return NextResponse.json({
      revenueByMonth,
      ordersByMonth,
      topShops,
      usersByMonth,
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        totalUsers,
        totalSellers,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        platformFeeRate: Math.round(platformFeeRate * 10) / 10,
      },
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
