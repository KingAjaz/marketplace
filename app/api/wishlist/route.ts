/**
 * Wishlist API
 * 
 * GET: Get user's wishlist
 * POST: Add product to wishlist
 * DELETE: Remove product from wishlist
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wishlistItems = await prisma.wishlist.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        product: {
          include: {
            shop: {
              select: {
                id: true,
                name: true,
                rating: true,
                totalReviews: true,
              },
            },
            pricingUnits: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
                unit: true,
                price: true,
                stock: true,
              },
              orderBy: {
                price: 'asc',
              },
              take: 5,
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ items: wishlistItems })
  } catch (error: any) {
    console.error('Get wishlist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch wishlist' },
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

    const { productId } = await request.json()

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Verify product exists and is available
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        isAvailable: true,
        shop: {
          isActive: true,
          user: {
            roles: {
              some: {
                role: 'SELLER',
                isActive: true,
                sellerStatus: 'APPROVED',
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or unavailable' },
        { status: 404 }
      )
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 400 }
      )
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId: session.user.id,
        productId,
      },
      include: {
        product: {
          include: {
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Product added to wishlist',
      item: wishlistItem,
    })
  } catch (error: any) {
    console.error('Add to wishlist error:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Product already in wishlist' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to add to wishlist' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    // Remove from wishlist
    const deleted = await prisma.wishlist.deleteMany({
      where: {
        userId: session.user.id,
        productId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'Product not found in wishlist' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Product removed from wishlist',
    })
  } catch (error: any) {
    console.error('Remove from wishlist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to remove from wishlist' },
      { status: 500 }
    )
  }
}
