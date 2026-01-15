/**
 * Automatic Delivery Assignment
 * 
 * Automatically assigns the nearest available online rider to a delivery
 */
import { prisma } from './prisma'
import { calculateDistance } from './distance'
import { DeliveryStatus } from '@prisma/client'
import { notifyDeliveryAssigned } from './notifications'

interface RiderLocation {
  riderId: string
  latitude: number | null
  longitude: number | null
  distance: number
}

/**
 * Find nearest available online rider to delivery location
 * @param deliveryLatitude Delivery address latitude
 * @param deliveryLongitude Delivery address longitude
 * @returns Nearest rider ID or null if none available
 */
export async function findNearestAvailableRider(
  deliveryLatitude: number | null,
  deliveryLongitude: number | null
): Promise<string | null> {
  if (!deliveryLatitude || !deliveryLongitude) {
    console.log('[Auto-Assign] No delivery coordinates, skipping automatic assignment')
    return null
  }

  // Get all approved and online riders
  const riders = await prisma.userRole.findMany({
    where: {
      role: 'RIDER',
      riderStatus: 'APPROVED',
      isActive: true,
      isOnline: true, // Only online riders
    },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  })

  if (riders.length === 0) {
    console.log('[Auto-Assign] No online riders available')
    return null
  }

  // Get rider locations (from their recent deliveries or user location)
  // For now, we'll use shop coordinates as a fallback or require riders to have location
  // In a real system, you'd track rider's current location separately
  const riderLocations: RiderLocation[] = []

  for (const riderRole of riders) {
    // Try to get rider's current location from their most recent active delivery
    const recentDelivery = await prisma.delivery.findFirst({
      where: {
        riderId: riderRole.userId,
        status: {
          in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
        },
      },
      include: {
        order: {
          select: {
            shop: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Use rider's current location from delivery, or shop location as fallback
    let riderLat: number | null = null
    let riderLng: number | null = null

    if (recentDelivery) {
      // Use rider's current location from delivery tracking
      riderLat = recentDelivery.riderLatitude
      riderLng = recentDelivery.riderLongitude

      // Fallback to shop location if rider location not available
      if (!riderLat || !riderLng) {
        riderLat = recentDelivery.order.shop.latitude
        riderLng = recentDelivery.order.shop.longitude
      }
    }

    // If we have coordinates, calculate distance
    if (riderLat && riderLng) {
      const distance = calculateDistance(
        deliveryLatitude,
        deliveryLongitude,
        riderLat,
        riderLng
      )
      riderLocations.push({
        riderId: riderRole.userId,
        latitude: riderLat,
        longitude: riderLng,
        distance,
      })
    }
  }

  if (riderLocations.length === 0) {
    console.log('[Auto-Assign] No riders with location data available')
    return null
  }

  // Sort by distance and return nearest rider
  riderLocations.sort((a, b) => a.distance - b.distance)
  const nearestRider = riderLocations[0]

  console.log(`[Auto-Assign] Nearest rider found: ${nearestRider.riderId} (${nearestRider.distance.toFixed(2)} km away)`)

  return nearestRider.riderId
}

/**
 * Automatically assign nearest available rider to a delivery
 * @param deliveryId Delivery ID to assign
 * @returns true if assignment successful, false otherwise
 */
export async function autoAssignRider(deliveryId: string): Promise<boolean> {
  try {
    // Get delivery with order and shop coordinates
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryLatitude: true,
            deliveryLongitude: true,
            shop: {
              select: {
                latitude: true,
                longitude: true,
              },
            },
          },
        },
      },
    })

    if (!delivery) {
      console.error(`[Auto-Assign] Delivery ${deliveryId} not found`)
      return false
    }

    // Check if already assigned
    if (delivery.riderId) {
      console.log(`[Auto-Assign] Delivery ${deliveryId} already assigned to rider ${delivery.riderId}`)
      return false
    }

    // Find nearest available rider
    const riderId = await findNearestAvailableRider(
      delivery.order.deliveryLatitude,
      delivery.order.deliveryLongitude
    )

    if (!riderId) {
      console.log(`[Auto-Assign] No available rider found for delivery ${deliveryId}`)
      return false
    }

    // Assign rider
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        riderId,
        status: DeliveryStatus.ASSIGNED,
      },
    })

    // Send notification to rider
    await notifyDeliveryAssigned(
      riderId,
      delivery.order.orderNumber,
      delivery.order.id
    )

    console.log(`[Auto-Assign] Successfully assigned rider ${riderId} to delivery ${deliveryId}`)
    return true
  } catch (error) {
    console.error(`[Auto-Assign] Failed to auto-assign rider to delivery ${deliveryId}:`, error)
    return false
  }
}
