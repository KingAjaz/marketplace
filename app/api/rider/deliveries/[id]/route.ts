/**
 * Update Delivery Status API
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryStatus, OrderStatus } from '@prisma/client'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    const delivery = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: { order: true },
    })

    if (!delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    }

    // If assigning, set rider
    if (status === 'ASSIGNED' && !delivery.riderId) {
      await prisma.delivery.update({
        where: { id: params.id },
        data: {
          status: status as DeliveryStatus,
          riderId: session.user.id,
        },
      })
    } else if (delivery.riderId === session.user.id) {
      // Update status
      const updateData: any = {
        status: status as DeliveryStatus,
      }

      if (status === 'PICKED_UP') {
        updateData.pickedUpAt = new Date()
        // Update order status
        await prisma.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.OUT_FOR_DELIVERY },
        })
      } else if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date()
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: delivery.orderId },
          data: { status: OrderStatus.DELIVERED, deliveredAt: new Date() },
          include: {
            payment: true,
          },
        })

        // Auto-release escrow if payment is in escrow
        if (
          updatedOrder.payment &&
          updatedOrder.payment.status === 'COMPLETED' &&
          updatedOrder.payment.escrowStatus === 'HELD'
        ) {
          await prisma.payment.update({
            where: { id: updatedOrder.payment.id },
            data: {
              status: 'RELEASED',
              escrowStatus: 'RELEASED',
              releasedAt: new Date(),
            },
          })
          console.log(`[Auto-Release] Escrow released for order ${updatedOrder.orderNumber} after delivery`)
        }
      }

      await prisma.delivery.update({
        where: { id: params.id },
        data: updateData,
      })
    } else {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ message: 'Delivery status updated' })
  } catch (error) {
    console.error('Update delivery error:', error)
    return NextResponse.json(
      { error: 'Failed to update delivery' },
      { status: 500 }
    )
  }
}
