/**
export const dynamic = 'force-dynamic'
 * Check if product is in wishlist API
 * 
 * GET: Check if a product is in user's wishlist
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ isInWishlist: false })
    }

    const searchParams = request.nextUrl.searchParams
    const productId = searchParams.get('productId')

    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      )
    }

    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId: session.user.id,
          productId,
        },
      },
    })

    return NextResponse.json({
      isInWishlist: !!wishlistItem,
    })
  } catch (error: any) {
    console.error('Check wishlist error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check wishlist' },
      { status: 500 }
    )
  }
}
