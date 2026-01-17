/**
export const dynamic = 'force-dynamic'
 * Rider Earnings API
 * 
 * GET: Get rider earnings breakdown by period
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryStatus, OrderStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a rider
    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
        riderStatus: 'APPROVED',
        isActive: true,
      },
    })

    if (!riderRole) {
      return NextResponse.json(
        { error: 'Rider access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'all' // all, today, week, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build date filter
    let dateFilter: { gte?: Date; lte?: Date } = {}
    
    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    } else if (period === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      dateFilter = { gte: today, lte: tomorrow }
    } else if (period === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      weekAgo.setHours(0, 0, 0, 0)
      dateFilter = { gte: weekAgo }
    } else if (period === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      monthAgo.setHours(0, 0, 0, 0)
      dateFilter = { gte: monthAgo }
    }

    // Get all completed deliveries for this rider
    const deliveries = await prisma.delivery.findMany({
      where: {
        riderId: session.user.id,
        status: DeliveryStatus.DELIVERED,
        ...(Object.keys(dateFilter).length > 0 && {
          deliveredAt: dateFilter,
        }),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryFee: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            total: true,
            deliveredAt: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        deliveredAt: 'desc',
      },
    })

    // Calculate earnings
    const totalEarnings = deliveries.reduce(
      (sum, delivery) => sum + (delivery.order.deliveryFee || 0),
      0
    )
    const completedDeliveries = deliveries.length

    // Group by day for chart data
    const earningsByDay = deliveries.reduce((acc, delivery) => {
      if (!delivery.deliveredAt) return acc
      const date = new Date(delivery.deliveredAt).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { date, earnings: 0, count: 0 }
      }
      acc[date].earnings += delivery.order.deliveryFee || 0
      acc[date].count += 1
      return acc
    }, {} as Record<string, { date: string; earnings: number; count: number }>)

    const earningsChartData = Object.values(earningsByDay)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days

    // Calculate average earnings per delivery
    const averageEarnings = completedDeliveries > 0
      ? totalEarnings / completedDeliveries
      : 0

    return NextResponse.json({
      totalEarnings,
      completedDeliveries,
      averageEarnings: Math.round(averageEarnings * 100) / 100,
      deliveries: deliveries.map((d) => ({
        id: d.id,
        orderNumber: d.order.orderNumber,
        deliveryFee: d.order.deliveryFee,
        deliveryAddress: `${d.order.deliveryAddress}, ${d.order.deliveryCity}, ${d.order.deliveryState}`,
        shopName: d.order.shop.name,
        deliveredAt: d.deliveredAt,
      })),
      chartData: earningsChartData,
      period,
    })
  } catch (error: any) {
    console.error('Get rider earnings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
