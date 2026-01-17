/**
export const dynamic = 'force-dynamic'
 * Admin Shops API
 * 
 * GET: Get all shops with filters (status, rating, revenue)
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // active, inactive, all
    const minRating = searchParams.get('minRating') // Minimum rating
    const search = searchParams.get('search') // Search by shop name
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status && status !== 'all') {
      where.isActive = status === 'active'
    }

    if (minRating) {
      where.rating = {
        gte: parseFloat(minRating),
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get shops with related data
    const shops = await prisma.shop.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            roles: {
              where: {
                role: 'SELLER',
              },
              select: {
                sellerStatus: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: true,
            orders: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    // Calculate revenue for each shop (from released payments)
    const shopsWithRevenue = await Promise.all(
      shops.map(async (shop) => {
        // Calculate total revenue (from released payments)
        const releasedPayments = await prisma.payment.findMany({
          where: {
            order: {
              shopId: shop.id,
            },
            status: 'RELEASED',
          },
          select: {
            amount: true,
          },
        })

        const revenue = releasedPayments.reduce((sum, p) => sum + p.amount, 0)

        // Calculate recent revenue (last 30 days)
        const recentPayments = await prisma.payment.findMany({
          where: {
            order: {
              shopId: shop.id,
            },
            status: 'RELEASED',
            releasedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
          select: {
            amount: true,
          },
        })

        const recentRevenue = recentPayments.reduce((sum, p) => sum + p.amount, 0)

        return {
          id: shop.id,
          name: shop.name,
          description: shop.description,
          logo: shop.logo,
          banner: shop.banner,
          address: shop.address,
          city: shop.city,
          state: shop.state,
          latitude: shop.latitude,
          longitude: shop.longitude,
          isActive: shop.isActive,
          rating: shop.rating,
          totalReviews: shop.totalReviews,
          createdAt: shop.createdAt,
          updatedAt: shop.updatedAt,
          seller: {
            id: shop.user.id,
            name: shop.user.name,
            email: shop.user.email,
            phoneNumber: shop.user.phoneNumber,
            sellerStatus: shop.user.roles[0]?.sellerStatus || null,
            isActive: shop.user.roles[0]?.isActive ?? true,
          },
          stats: {
            totalProducts: shop._count.products,
            totalOrders: shop._count.orders,
            totalReviews: shop._count.reviews,
            revenue,
            recentRevenue,
          },
        }
      })
    )

    // Get total count for pagination
    const totalCount = await prisma.shop.count({ where })

    return NextResponse.json({
      shops: shopsWithRevenue,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('Get admin shops error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shops' },
      { status: 500 }
    )
  }
}
