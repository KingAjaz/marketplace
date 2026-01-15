/**
 * Disputes API
 * 
 * POST: Create a new dispute
 * GET: Get disputes for the current user (buyer or seller)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DisputeStatus, OrderStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orderId, reason, buyerNotes } = await request.json()

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'Order ID and reason are required' },
        { status: 400 }
      )
    }

    // Get order and verify it belongs to buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: {
          select: {
            userId: true,
          },
        },
        dispute: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if dispute already exists
    if (order.dispute) {
      return NextResponse.json(
        { error: 'Dispute already exists for this order' },
        { status: 400 }
      )
    }

    // Verify order can be disputed (must be paid and not already delivered for too long)
    if (order.status === 'PENDING') {
      return NextResponse.json(
        { error: 'Cannot dispute unpaid orders' },
        { status: 400 }
      )
    }

    // Create dispute
    const dispute = await prisma.dispute.create({
      data: {
        orderId,
        buyerId: session.user.id,
        sellerId: order.shop.userId,
        reason,
        buyerNotes: buyerNotes?.trim() || null,
        status: DisputeStatus.OPEN,
      },
    })

    // Update order status to DISPUTED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.DISPUTED,
      },
    })

    // Update payment escrow status to DISPUTED
    if (order.payment) {
      await prisma.payment.update({
        where: { orderId },
        data: {
          escrowStatus: 'DISPUTED',
        },
      })
    }

    // Create notifications
    const { notifyDisputeCreated } = await import('@/lib/notifications')
    await notifyDisputeCreated(dispute.id, session.user.id, order.shop.userId, order.orderNumber)

    return NextResponse.json({
      message: 'Dispute created successfully',
      dispute,
    })
  } catch (error: any) {
    console.error('Create dispute error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create dispute' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const role = searchParams.get('role') // 'buyer' or 'seller'

    const where: any = {}

    // Filter by role
    if (role === 'buyer') {
      where.buyerId = session.user.id
    } else if (role === 'seller') {
      where.sellerId = session.user.id
    } else {
      // Get disputes where user is either buyer or seller
      where.OR = [
        { buyerId: session.user.id },
        { sellerId: session.user.id },
      ]
    }

    // Filter by status
    if (status && Object.values(DisputeStatus).includes(status as DisputeStatus)) {
      where.status = status
    }

    const disputes = await prisma.dispute.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ disputes })
  } catch (error: any) {
    console.error('Get disputes error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch disputes' },
      { status: 500 }
    )
  }
}
