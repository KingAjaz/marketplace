/**
 * Single Order API
 * Get order details (supports both buyer and seller views)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    if (!id || typeof id !== 'string') {
      console.error('GET /api/orders/[id]: Invalid order ID', { id, type: typeof id })
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    console.log('GET /api/orders/[id]: Fetching order', { id, userId: session.user.id })

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            userId: true,
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
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
            pricingUnit: {
              select: {
                id: true,
                unit: true,
                price: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            escrowStatus: true,
            paystackRef: true,
            paidAt: true,
            releasedAt: true,
            amount: true,
          },
        },
        delivery: {
          include: {
            rider: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
              },
            },
          },
        },
        dispute: {
          select: {
            id: true,
            status: true,
          },
        },
        review: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
        riderRating: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
      },
    })

    if (!order) {
      console.error('GET /api/orders/[id]: Order not found', { id, userId: session.user.id })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('GET /api/orders/[id]: Order found', { 
      orderId: order.id, 
      buyerId: order.buyerId, 
      sessionUserId: session.user.id,
      buyerIdType: typeof order.buyerId,
      sessionUserIdType: typeof session.user.id,
      buyerIdsMatch: order.buyerId === session.user.id,
      buyerIdsEqual: String(order.buyerId) === String(session.user.id)
    })

    // Check if user is buyer or seller (use string comparison to handle type mismatches)
    const isBuyer = String(order.buyerId) === String(session.user.id)
    const isSeller = order.shop?.userId && String(order.shop.userId) === String(session.user.id)

    if (!isBuyer && !isSeller) {
      console.log('User is not buyer or seller, checking for admin role')
      // Check if user is admin
      const adminRole = await prisma.userRole.findFirst({
        where: {
          userId: session.user.id,
          role: 'ADMIN',
          isActive: true,
        },
      })

      if (!adminRole) {
        console.error('GET /api/orders/[id]: Unauthorized access attempt', { 
          orderId: order.id, 
          buyerId: order.buyerId, 
          sessionUserId: session.user.id,
          isBuyer,
          isSeller,
          hasAdminRole: !!adminRole
        })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    return NextResponse.json({ 
      order,
      userRole: isBuyer ? 'buyer' : isSeller ? 'seller' : 'admin',
    })
  } catch (error) {
    console.error('Get order error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}
