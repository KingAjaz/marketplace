/**
 * Rider Location Update API
 * 
 * Allows riders to update their current location for active deliveries
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a rider
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
        isActive: true,
        riderStatus: 'APPROVED',
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'You must be an approved rider to update location' },
        { status: 403 }
      )
    }

    const { latitude, longitude, deliveryId } = await request.json()

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      )
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Latitude and longitude must be numbers' },
        { status: 400 }
      )
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid coordinates' },
        { status: 400 }
      )
    }

    // If deliveryId is provided, update that specific delivery
    if (deliveryId) {
      const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        include: {
          order: {
            select: {
              id: true,
            },
          },
        },
      })

      if (!delivery) {
        return NextResponse.json(
          { error: 'Delivery not found' },
          { status: 404 }
        )
      }

      if (delivery.riderId !== session.user.id) {
        return NextResponse.json(
          { error: 'Unauthorized to update this delivery location' },
          { status: 403 }
        )
      }

      // Update delivery with rider location
      await prisma.delivery.update({
        where: { id: deliveryId },
        data: {
          riderLatitude: latitude,
          riderLongitude: longitude,
        },
      })

      return NextResponse.json({
        message: 'Location updated successfully',
        delivery: {
          id: delivery.id,
          riderLatitude: latitude,
          riderLongitude: longitude,
        },
      })
    } else {
      // Update all active deliveries for this rider
      const activeDeliveries = await prisma.delivery.findMany({
        where: {
          riderId: session.user.id,
          status: {
            in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
          },
        },
      })

      // Update all active deliveries
      await Promise.all(
        activeDeliveries.map((delivery) =>
          prisma.delivery.update({
            where: { id: delivery.id },
            data: {
              riderLatitude: latitude,
              riderLongitude: longitude,
            },
          })
        )
      )

      return NextResponse.json({
        message: 'Location updated for all active deliveries',
        updatedCount: activeDeliveries.length,
      })
    }
  } catch (error: any) {
    console.error('Update rider location error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update location' },
      { status: 500 }
    )
  }
}
