/**
 * Admin Resolve Dispute API
 * 
 * POST: Resolve a dispute with a resolution decision
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DisputeStatus, DisputeResolution, PaymentStatus, EscrowStatus, OrderStatus } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params
    const { resolution, adminNotes } = await request.json()

    if (!resolution || !Object.values(DisputeResolution).includes(resolution)) {
      return NextResponse.json(
        { error: 'Valid resolution is required' },
        { status: 400 }
      )
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payment: true,
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      )
    }

    if (dispute.status === 'RESOLVED' || dispute.status === 'CLOSED') {
      return NextResponse.json(
        { error: 'Dispute already resolved or closed' },
        { status: 400 }
      )
    }

    // Update dispute
    await prisma.dispute.update({
      where: { id },
      data: {
        status: DisputeStatus.RESOLVED,
        resolution: resolution as DisputeResolution,
        adminNotes: adminNotes?.trim() || null,
        resolvedAt: new Date(),
      },
    })

    // Handle payment based on resolution
    if (dispute.order.payment) {
      if (resolution === 'BUYER_WINS') {
        // Refund buyer
        await prisma.payment.update({
          where: { id: dispute.order.payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            escrowStatus: EscrowStatus.REFUNDED,
            refundedAt: new Date(),
          },
        })
      } else if (resolution === 'SELLER_WINS') {
        // Release to seller
        await prisma.payment.update({
          where: { id: dispute.order.payment.id },
          data: {
            status: PaymentStatus.RELEASED,
            escrowStatus: EscrowStatus.RELEASED,
            releasedAt: new Date(),
          },
        })
      } else if (resolution === 'PARTIAL') {
        // Partial refund - for now, mark as refunded (you can implement partial logic later)
        await prisma.payment.update({
          where: { id: dispute.order.payment.id },
          data: {
            status: PaymentStatus.REFUNDED,
            escrowStatus: EscrowStatus.REFUNDED,
            refundedAt: new Date(),
          },
        })
      }
    }

    // Update order status
    await prisma.order.update({
      where: { id: dispute.orderId },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Dispute resolved successfully',
      dispute: {
        id: dispute.id,
        resolution,
        status: 'RESOLVED',
      },
    })
  } catch (error: any) {
    console.error('Resolve dispute error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resolve dispute' },
      { status: 500 }
    )
  }
}
