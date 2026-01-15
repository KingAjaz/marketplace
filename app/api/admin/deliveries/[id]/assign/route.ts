/**
 * Admin Assign Delivery API
 * 
 * Manually assign a rider to a delivery
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client'

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
    const { riderId } = await request.json()

    if (!riderId) {
      return NextResponse.json(
        { error: 'Rider ID is required' },
        { status: 400 }
      )
    }

    // Verify rider exists and is approved
    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId: riderId,
        role: 'RIDER',
        riderStatus: 'APPROVED',
        isActive: true,
      },
    })

    if (!riderRole) {
      return NextResponse.json(
        { error: 'Invalid rider or rider not approved' },
        { status: 400 }
      )
    }

    // Get delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id },
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    if (delivery.riderId && delivery.riderId !== riderId) {
      return NextResponse.json(
        { error: 'Delivery already assigned to another rider' },
        { status: 400 }
      )
    }

    // Get order info for notification
    const deliveryWithOrder = await prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    })

    if (!deliveryWithOrder) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Assign rider
    await prisma.delivery.update({
      where: { id },
      data: {
        riderId,
        status: DeliveryStatus.ASSIGNED,
      },
    })

    // Send notification to rider
    const { notifyDeliveryAssigned } = await import('@/lib/notifications')
    await notifyDeliveryAssigned(
      riderId,
      deliveryWithOrder.order.orderNumber,
      deliveryWithOrder.order.id
    )

    return NextResponse.json({
      message: 'Rider assigned successfully',
    })
  } catch (error: any) {
    console.error('Assign delivery error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign rider' },
      { status: 500 }
    )
  }
}
