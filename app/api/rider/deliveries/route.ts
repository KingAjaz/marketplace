/**
 * Rider Deliveries API
 * 
 * GET: Get available deliveries for assignment
 * POST: Assign rider to a delivery
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DeliveryStatus } from '@prisma/client'

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
    const status = searchParams.get('status')

    // If no status filter, return all relevant deliveries:
    // 1. Unassigned pending deliveries (available for acceptance)
    // 2. Deliveries assigned to this rider (ASSIGNED, PICKED_UP, IN_TRANSIT)
    let deliveries

    if (status) {
      // Specific status filter
      const where: any = {}
      
      if (status === 'ASSIGNED') {
        where.riderId = session.user.id
        where.status = DeliveryStatus.ASSIGNED
      } else if (status === 'PENDING') {
        // Unassigned pending deliveries
        where.riderId = null
        where.status = DeliveryStatus.PENDING
      } else {
        where.riderId = session.user.id
        where.status = status as DeliveryStatus
      }

      deliveries = await prisma.delivery.findMany({
        where,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              deliveryAddress: true,
              deliveryCity: true,
              deliveryState: true,
              deliveryPhone: true,
              total: true,
              shop: {
                select: {
                  name: true,
                  address: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
          rider: {
            select: {
              name: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
    } else {
      // Get all relevant deliveries: unassigned pending + assigned to this rider
      deliveries = await prisma.delivery.findMany({
        where: {
          OR: [
            // Unassigned pending deliveries (available for acceptance)
            {
              riderId: null,
              status: DeliveryStatus.PENDING,
            },
            // Deliveries assigned to this rider (all statuses except DELIVERED and FAILED)
            {
              riderId: session.user.id,
              status: {
                in: [
                  DeliveryStatus.ASSIGNED,
                  DeliveryStatus.PICKED_UP,
                  DeliveryStatus.IN_TRANSIT,
                ],
              },
            },
          ],
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              deliveryAddress: true,
              deliveryCity: true,
              deliveryState: true,
              deliveryPhone: true,
              total: true,
              shop: {
                select: {
                  name: true,
                  address: true,
                  city: true,
                  state: true,
                },
              },
            },
          },
          rider: {
            select: {
              name: true,
              phoneNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50,
      })
    }

    return NextResponse.json({ deliveries })
  } catch (error: any) {
    console.error('Get rider deliveries error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const { deliveryId } = await request.json()

    if (!deliveryId) {
      return NextResponse.json(
        { error: 'Delivery ID is required' },
        { status: 400 }
      )
    }

    // Get delivery
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    if (delivery.riderId) {
      return NextResponse.json(
        { error: 'Delivery already assigned' },
        { status: 400 }
      )
    }

    if (delivery.status !== DeliveryStatus.PENDING) {
      return NextResponse.json(
        { error: 'Delivery is not available for assignment' },
        { status: 400 }
      )
    }

    // Assign rider
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        riderId: session.user.id,
        status: DeliveryStatus.ASSIGNED,
      },
    })

    return NextResponse.json({
      message: 'Delivery assigned successfully',
    })
  } catch (error: any) {
    console.error('Assign delivery error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to assign delivery' },
      { status: 500 }
    )
  }
}
