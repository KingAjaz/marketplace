/**
 * Rider Ratings API
 * 
 * POST: Submit a rating for a rider after delivery
 * GET: Get rider ratings (for a specific rider or order)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deliveryId, orderId, rating, comment } = await request.json()

    if (!deliveryId || !orderId || !rating) {
      return NextResponse.json(
        { error: 'Delivery ID, Order ID, and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get delivery and order to verify ownership and rider
    const delivery = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        order: {
          include: {
            buyer: true,
          },
        },
        rider: true,
      },
    })

    if (!delivery) {
      return NextResponse.json(
        { error: 'Delivery not found' },
        { status: 404 }
      )
    }

    // Verify buyer owns this order
    if (delivery.order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to rate this delivery' },
        { status: 403 }
      )
    }

    // Verify delivery is completed
    if (delivery.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Can only rate completed deliveries' },
        { status: 400 }
      )
    }

    // Verify rider exists
    if (!delivery.riderId || !delivery.rider) {
      return NextResponse.json(
        { error: 'No rider assigned to this delivery' },
        { status: 400 }
      )
    }

    // Check if rating already exists
    const existingRating = await prisma.riderRating.findUnique({
      where: { deliveryId },
    })

    if (existingRating) {
      return NextResponse.json(
        { error: 'You have already rated this rider' },
        { status: 400 }
      )
    }

    // Create rider rating
    const riderRating = await prisma.riderRating.create({
      data: {
        deliveryId,
        orderId,
        riderId: delivery.riderId,
        buyerId: session.user.id,
        rating,
        comment: comment?.trim() || null,
      },
      include: {
        rider: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calculate and update rider's average rating
    const allRatings = await prisma.riderRating.findMany({
      where: { riderId: delivery.riderId },
      select: { rating: true },
    })

    const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
    const totalRatings = allRatings.length

    // Update rider's rating in UserRole or create a separate field
    // For now, we'll store it in a way that can be queried
    // Note: This might require adding a rating field to UserRole or creating a separate RiderProfile model
    // For simplicity, we'll just return the calculated rating

    return NextResponse.json({
      message: 'Rider rating submitted successfully',
      rating: riderRating,
      riderStats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings,
      },
    })
  } catch (error: any) {
    console.error('Rider rating error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit rider rating' },
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
    const riderId = searchParams.get('riderId')
    const orderId = searchParams.get('orderId')
    const deliveryId = searchParams.get('deliveryId')

    if (riderId) {
      // Get all ratings for a rider
      const ratings = await prisma.riderRating.findMany({
        where: { riderId },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      const averageRating =
        ratings.length > 0
          ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
          : 0

      return NextResponse.json({
        ratings,
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
      })
    }

    if (orderId || deliveryId) {
      // Get rating for a specific order/delivery
      const rating = await prisma.riderRating.findUnique({
        where: deliveryId ? { deliveryId } : { orderId: orderId! },
        include: {
          rider: {
            select: {
              id: true,
              name: true,
            },
          },
          buyer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return NextResponse.json({ rating })
    }

    return NextResponse.json(
      { error: 'riderId, orderId, or deliveryId is required' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Get rider ratings error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch rider ratings' },
      { status: 500 }
    )
  }
}
