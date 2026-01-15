/**
 * Admin Escrow Release API
 * 
 * Releases escrow payment to seller after delivery confirmation
 * Can be called automatically or manually by admin
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, EscrowStatus, OrderStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
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

    const { orderId } = await params

    // Get order with payment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        shop: {
          select: {
            userId: true,
            name: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (!order.payment) {
      return NextResponse.json(
        { error: 'Payment not found for this order' },
        { status: 404 }
      )
    }

    // Verify payment is in escrow
    if (order.payment.status !== PaymentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Payment must be completed before release' },
        { status: 400 }
      )
    }

    if (order.payment.escrowStatus !== EscrowStatus.HELD) {
      return NextResponse.json(
        { error: `Payment already ${order.payment.escrowStatus.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Verify order is delivered
    if (order.status !== OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Order must be delivered before releasing escrow' },
        { status: 400 }
      )
    }

    // Calculate seller amount (total - platform fee)
    const sellerAmount = order.total - order.platformFee

    // Update payment status
    await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        status: PaymentStatus.RELEASED,
        escrowStatus: EscrowStatus.RELEASED,
        releasedAt: new Date(),
      },
    })

    // Create notification
    const { notifyPaymentReleased } = await import('@/lib/notifications')
    await notifyPaymentReleased(order.shop.userId, order.orderNumber, sellerAmount)

    console.log(`[Admin] Escrow released for order ${order.orderNumber}:`, {
      orderId: order.id,
      total: order.total,
      platformFee: order.platformFee,
      sellerAmount,
      releasedBy: session.user.id,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      message: 'Escrow released successfully',
      orderId: order.id,
      orderNumber: order.orderNumber,
      sellerAmount,
      platformFee: order.platformFee,
      total: order.total,
    })
  } catch (error: any) {
    console.error('Release escrow error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to release escrow' },
      { status: 500 }
    )
  }
}
