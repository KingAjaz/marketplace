/**
 * Admin Deliveries API
 * 
 * GET: Get all deliveries for admin management with filters
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const riderId = searchParams.get('riderId')

    const where: any = {}

    // Filter by status
    if (status && status !== 'ALL') {
      where.status = status as DeliveryStatus
    }

    // Filter by rider
    if (riderId) {
      where.riderId = riderId
    } else if (status === 'PENDING') {
      // If filtering for pending, show unassigned
      where.riderId = null
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            deliveryAddress: true,
            deliveryCity: true,
            deliveryState: true,
            deliveryPhone: true,
            deliveryLatitude: true,
            deliveryLongitude: true,
            createdAt: true,
            shop: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
              },
            },
            buyer: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        rider: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100, // Limit to 100 deliveries for performance
    })

    // Get delivery counts by status
    const counts = await Promise.all([
      prisma.delivery.count({ where: { status: DeliveryStatus.PENDING, riderId: null } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.ASSIGNED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.PICKED_UP } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.IN_TRANSIT } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.DELIVERED } }),
      prisma.delivery.count({ where: { status: DeliveryStatus.FAILED } }),
      prisma.delivery.count(),
    ])

    return NextResponse.json({
      deliveries,
      counts: {
        pending: counts[0],
        assigned: counts[1],
        pickedUp: counts[2],
        inTransit: counts[3],
        delivered: counts[4],
        failed: counts[5],
        total: counts[6],
      },
    })
  } catch (error: any) {
    console.error('Admin deliveries API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}
