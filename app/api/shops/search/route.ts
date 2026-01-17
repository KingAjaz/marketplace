/**
export const dynamic = 'force-dynamic'
 * Advanced Shop Search API
 * 
 * Enhanced shop search with filters
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city')
    const state = searchParams.get('state')
    const minRating = searchParams.get('minRating')
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, rating, name
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
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
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Location filters
    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' }
    }

    // Rating filter
    if (minRating) {
      where.rating = { gte: parseFloat(minRating) }
    }

    // Sort order
    let orderBy: any = { createdAt: 'desc' }
    if (sortBy === 'rating') {
      orderBy = { rating: 'desc' }
    } else if (sortBy === 'name') {
      orderBy = { name: 'asc' }
    }

    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          logo: true,
          address: true,
          city: true,
          state: true,
          rating: true,
          totalReviews: true,
          latitude: true,
          longitude: true,
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.shop.count({ where }),
    ])

    return NextResponse.json({
      shops,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Advanced shop search error:', error)
    return NextResponse.json(
      { error: 'Failed to search shops' },
      { status: 500 }
    )
  }
}
