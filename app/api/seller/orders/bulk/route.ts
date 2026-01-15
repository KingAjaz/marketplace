/**
 * Bulk Order Update API
 * 
 * Allows sellers to update multiple orders at once
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { orderIds, status } = await request.json()

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs array is required' },
        { status: 400 }
      )
    }

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Valid order status is required' },
        { status: 400 }
      )
    }

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Verify all orders belong to the seller's shop
    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        shopId: shop.id,
      },
      select: {
        id: true,
        status: true,
      },
    })

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'Some orders not found or unauthorized' },
        { status: 403 }
      )
    }

    // Validate status transitions
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['PREPARING'], // Can only move to PREPARING if payment is confirmed
      PAID: ['PREPARING'],
      PREPARING: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: [], // Cannot bulk update to this (requires delivery assignment)
      DELIVERED: [], // Cannot bulk update to delivered
      CANCELLED: [],
      DISPUTED: [],
    }

    // Filter orders that can be updated to the requested status
    const updatableOrders = orders.filter((order) => {
      const allowed = validTransitions[order.status] || []
      return allowed.includes(status)
    })

    if (updatableOrders.length === 0) {
      return NextResponse.json(
        { error: 'No orders can be updated to the requested status' },
        { status: 400 }
      )
    }

    // Update orders
    const result = await prisma.order.updateMany({
      where: {
        id: { in: updatableOrders.map((o) => o.id) },
      },
      data: {
        status: status as OrderStatus,
      },
    })

    // Create notifications for updated orders
    const updatedOrders = await prisma.order.findMany({
      where: {
        id: { in: updatableOrders.map((o) => o.id) },
      },
      select: {
        id: true,
        orderNumber: true,
        buyerId: true,
      },
    })

    const { notifyOrderStatusUpdate } = await import('@/lib/notifications')
    await Promise.all(
      updatedOrders.map((order) =>
        notifyOrderStatusUpdate(
          order.id,
          order.buyerId,
          shop.userId,
          order.orderNumber,
          status
        )
      )
    )

    return NextResponse.json({
      message: 'Orders updated successfully',
      updatedCount: result.count,
      totalRequested: orderIds.length,
      skipped: orderIds.length - result.count,
    })
  } catch (error: any) {
    console.error('Bulk update orders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update orders' },
      { status: 500 }
    )
  }
}
