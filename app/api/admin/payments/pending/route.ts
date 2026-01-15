/**
 * Admin Pending Escrow Payments API
 * 
 * Get all orders with payments held in escrow that are ready for release
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, EscrowStatus, OrderStatus } from '@prisma/client'

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

    // Get orders with payments held in escrow
    const orders = await prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        payment: {
          status: PaymentStatus.COMPLETED,
          escrowStatus: EscrowStatus.HELD,
        },
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            escrowStatus: true,
            paidAt: true,
          },
        },
        delivery: {
          select: {
            deliveredAt: true,
          },
        },
      },
      orderBy: {
        deliveredAt: 'desc',
      },
      take: 50,
    })

    // Calculate seller amounts
    const ordersWithAmounts = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      shop: order.shop,
      buyer: order.buyer,
      total: order.total,
      platformFee: order.platformFee,
      sellerAmount: order.total - order.platformFee,
      payment: order.payment,
      deliveredAt: order.delivery?.deliveredAt || order.deliveredAt,
      createdAt: order.createdAt,
    }))

    return NextResponse.json({
      orders: ordersWithAmounts,
      total: ordersWithAmounts.length,
      totalAmount: ordersWithAmounts.reduce((sum, o) => sum + o.sellerAmount, 0),
      totalPlatformFee: ordersWithAmounts.reduce((sum, o) => sum + o.platformFee, 0),
    })
  } catch (error: any) {
    console.error('Pending escrow error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending escrow payments' },
      { status: 500 }
    )
  }
}
