/**
 * Single Seller Order API
 * 
 * PATCH: Update order status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()

    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { error: 'Invalid order status' },
        { status: 400 }
      )
    }

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Verify order belongs to seller's shop
    const order = await prisma.order.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status
    const updated = await prisma.order.update({
      where: { id },
      data: { status: status as OrderStatus },
    })

    // Create notification for buyer
    const { notifyOrderStatusUpdate } = await import('@/lib/notifications')
    await notifyOrderStatusUpdate(updated.id, updated.buyerId, session.user.id, updated.orderNumber, status)

    return NextResponse.json({ order: updated })
  } catch (error: any) {
    console.error('Update order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update order' },
      { status: 500 }
    )
  }
}
