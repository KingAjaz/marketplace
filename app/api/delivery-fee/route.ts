/**
 * Delivery Fee Calculation API
 * 
 * Calculates delivery fee based on shop and delivery address coordinates
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateDeliveryFeeFromCoordinates } from '@/lib/delivery-fee'

export async function POST(request: NextRequest) {
  try {
    const { shopId, deliveryLatitude, deliveryLongitude } = await request.json()

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    // Get shop coordinates
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: {
        latitude: true,
        longitude: true,
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // If delivery coordinates are not provided, return default fee
    if (deliveryLatitude === null || deliveryLatitude === undefined || 
        deliveryLongitude === null || deliveryLongitude === undefined) {
      return NextResponse.json({
        deliveryFee: 500, // Default fee
        distance: null,
        estimated: true,
      })
    }

    // Calculate delivery fee
    const deliveryFee = calculateDeliveryFeeFromCoordinates(
      shop.latitude,
      shop.longitude,
      deliveryLatitude,
      deliveryLongitude
    )

    if (deliveryFee === null) {
      // If calculation fails, return default fee
      return NextResponse.json({
        deliveryFee: 500,
        distance: null,
        estimated: true,
      })
    }

    // Calculate distance for display (optional)
    const { calculateDistance } = await import('@/lib/distance')
    const distance = shop.latitude && shop.longitude
      ? calculateDistance(
          shop.latitude,
          shop.longitude,
          deliveryLatitude,
          deliveryLongitude
        )
      : null

    return NextResponse.json({
      deliveryFee,
      distance,
      estimated: false,
    })
  } catch (error: any) {
    console.error('Delivery fee calculation error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to calculate delivery fee',
        deliveryFee: 500, // Return default fee on error
      },
      { status: 500 }
    )
  }
}
