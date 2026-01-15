/**
 * Advanced Product Search API
 * 
 * Enhanced search with multiple filters
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') as ProductCategory | null
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const minRating = searchParams.get('minRating')
    const shopId = searchParams.get('shopId')
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, price_asc, price_desc, name, rating
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

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

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Category filter
    if (category) {
      where.category = category
    }

    // Shop filter
    if (shopId) {
      where.shopId = shopId
    }

    // Rating filter
    if (minRating) {
      where.shop = {
        ...where.shop,
        rating: {
          gte: parseFloat(minRating),
        },
      }
    }

    // Price filter (requires subquery on pricing units)
    if (minPrice || maxPrice) {
      const priceFilter: any = {}
      if (minPrice) priceFilter.gte = parseFloat(minPrice)
      if (maxPrice) priceFilter.lte = parseFloat(maxPrice)

      where.pricingUnits = {
        some: {
          price: priceFilter,
          isActive: true,
        },
      }
    }

    // Sort order
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'price_asc') {
      orderBy = { pricingUnits: { _min: { price: 'asc' } } }
    } else if (sortBy === 'price_desc') {
      orderBy = { pricingUnits: { _min: { price: 'desc' } } }
    } else if (sortBy === 'name') {
      orderBy = { name: 'asc' }
    } else if (sortBy === 'rating') {
      orderBy = { shop: { rating: 'desc' } }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
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
              rating: true,
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
            take: 5,
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    )
  }
}
