/**
 * Single Shop API
 * Get shop details with all products
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category') as ProductCategory | null
    const search = searchParams.get('search') || ''

    // Get shop with products
    const shop = await prisma.shop.findFirst({
      where: {
        id,
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
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        banner: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        rating: true,
        totalReviews: true,
        operatingHours: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Get products for this shop
    const productWhere: any = {
      shopId: id,
      isAvailable: true,
    }

    if (category) {
      productWhere.category = category
    }

    if (search) {
      productWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const products = await prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        images: true,
        isAvailable: true,
        createdAt: true,
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
          take: 5,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(
      {
        shop,
        products,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    )
  } catch (error) {
    console.error('Shop API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop' },
      { status: 500 }
    )
  }
}
