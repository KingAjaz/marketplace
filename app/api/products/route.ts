/**
 * Products API
 * Get products with optional filtering by category and search
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as ProductCategory | null
    const search = searchParams.get('search') || ''

    const where: any = {
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
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        images: true,
        isAvailable: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
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
          },
          orderBy: {
            price: 'asc',
          },
          take: 5, // Limit pricing units per product
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Reduced from 100 for better performance
    })

    return NextResponse.json(
      { products },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error: any) {
    console.error('Products API error:', error)
    
    let errorMessage = 'Failed to fetch products'
    if (error.message?.includes('database') || error.message?.includes('connection')) {
      errorMessage = 'Database connection error. Please try again later.'
    } else if (error.message) {
      errorMessage = `Failed to fetch products: ${error.message}`
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
