/**
export const dynamic = 'force-dynamic'
 * Seller Analytics API
 * 
 * Provides detailed analytics data for charts and graphs
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
        revenueByMonth: [],
        ordersByMonth: [],
        topProducts: [],
        orderStatusDistribution: [],
      })
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
        order: {
          shopId: shop.id,
        },
        status: 'RELEASED',
        releasedAt: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        order: {
          select: {
            total: true,
            platformFee: true,
            createdAt: true,
          },
        },
      },
    })

    // Group revenue by month
    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthPayments = payments.filter((p) => {
        const paymentDate = p.releasedAt || p.order.createdAt
        const paymentMonth = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}`
        return paymentMonth === monthKey
      })

      const revenue = monthPayments.reduce((sum, p) => {
        return sum + (p.order.total - p.order.platformFee)
      }, 0)

      return {
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue: Math.round(revenue * 100) / 100,
      }
    })

    // Orders by month
    const orders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
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

    // Top products by sales
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          shopId: shop.id,
          createdAt: {
            gte: startDate,
          },
        },
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    })

    const productSales = orderItems.reduce((acc: any, item) => {
      const productName = item.product.name
      if (!acc[productName]) {
        acc[productName] = { name: productName, sales: 0, quantity: 0 }
      }
      acc[productName].sales += item.total
      acc[productName].quantity += item.quantity
      return acc
    }, {})

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.sales - a.sales)
      .slice(0, 10)
      .map((p: any) => ({
        name: p.name,
        sales: Math.round(p.sales * 100) / 100,
        quantity: p.quantity,
      }))

    // Order status distribution
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        shopId: shop.id,
        createdAt: {
          gte: startDate,
        },
      },
      _count: {
        id: true,
      },
    })

    const orderStatusDistribution = statusCounts.map((s) => ({
      status: s.status,
      count: s._count.id,
    }))

    // Calculate metrics for the selected period
    const periodOrders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
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
      if (order.payment) {
        return sum + (order.total - order.platformFee)
      }
      return sum
    }, 0)

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Get unique customers
    const uniqueBuyers = new Set(periodOrders.map(order => order.buyerId))
    const totalCustomers = uniqueBuyers.size

    // Calculate repeat customers (customers with more than 1 order)
    const buyerOrderCounts = periodOrders.reduce((acc: any, order) => {
      acc[order.buyerId] = (acc[order.buyerId] || 0) + 1
      return acc
    }, {})

    const repeatCustomers = Object.values(buyerOrderCounts).filter((count: any) => count > 1).length
    const repeatCustomerRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0

    // Conversion rate - simplified (we'd need visitor data for accurate conversion)
    // For now, we'll use a placeholder or calculate based on orders vs unique visitors to shop
    // Since we don't track visitors, we'll estimate based on orders per unique customer
    const ordersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0
    const conversionRate = Math.min(ordersPerCustomer * 10, 100) // Simplified estimate

    return NextResponse.json({
      revenueByMonth,
      ordersByMonth,
      topProducts,
      orderStatusDistribution,
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        totalCustomers,
        repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
      },
    })
  } catch (error) {
    console.error('Seller analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
