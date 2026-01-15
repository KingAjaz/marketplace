/**
 * Reviews API
 * 
 * POST: Create a review for an order
 * GET: Get reviews for a shop
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

    const { orderId, rating, comment } = await request.json()

    if (!orderId || !rating) {
      return NextResponse.json(
        { error: 'Order ID and rating are required' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    // Get order and verify it belongs to buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shop: {
          select: {
            id: true,
          },
        },
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

    // Verify order is delivered
    if (order.status !== 'DELIVERED') {
      return NextResponse.json(
        { error: 'Order must be delivered before leaving a review' },
        { status: 400 }
      )
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { orderId },
    })

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this order' },
        { status: 400 }
      )
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId,
        buyerId: session.user.id,
        shopId: order.shopId,
        rating,
        comment: comment?.trim() || null,
      },
    })

    // Update shop rating
    await updateShopRating(order.shopId)

    return NextResponse.json({
      message: 'Review created successfully',
      review,
    })
  } catch (error: any) {
    console.error('Create review error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create review' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get('shopId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      )
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { shopId },
        include: {
          buyer: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
      }),
      prisma.review.count({
        where: { shopId },
      }),
    ])

    return NextResponse.json({
      reviews,
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Get reviews error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

/**
 * Update shop rating based on all reviews
 */
async function updateShopRating(shopId: string) {
  const reviews = await prisma.review.findMany({
    where: { shopId },
    select: {
      rating: true,
    },
  })

  if (reviews.length === 0) {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        rating: 0,
        totalReviews: 0,
      },
    })
    return
  }

  const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0)
  const averageRating = totalRating / reviews.length

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalReviews: reviews.length,
    },
  })
}
