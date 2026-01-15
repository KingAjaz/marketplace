/**
 * Single Product API
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const product = await prisma.product.findUnique({
      where: { id },
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
          orderBy: {
            price: 'asc',
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { product },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error: any) {
    console.error('Product API error:', error)
    
    let errorMessage = 'Failed to fetch product'
    if (error.message?.includes('database') || error.message?.includes('connection')) {
      errorMessage = 'Database connection error. Please try again later.'
    } else if (error.message) {
      errorMessage = `Failed to fetch product: ${error.message}`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
