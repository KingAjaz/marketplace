/**
 * Admin Shop Details API
 * 
 * GET: Get detailed information about a specific shop including products, reviews, disputes, revenue
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shopId: string }> }
) {
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

    const { shopId } = await params

    // Get shop with all related data
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            emailVerified: true,
            phoneVerified: true,
            createdAt: true,
            roles: {
              where: {
                role: 'SELLER',
              },
              select: {
                sellerStatus: true,
                isActive: true,
                kycSubmitted: true,
                kycApproved: true,
                createdAt: true,
              },
            },
          },
        },
        products: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            _count: {
              select: {
                orderItems: true,
              },
            },
            pricingUnits: {
              where: {
                isActive: true,
              },
              take: 3,
            },
          },
        },
        orders: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            buyer: {
              select: {
                name: true,
                email: true,
              },
            },
            payment: {
              select: {
                status: true,
                escrowStatus: true,
                amount: true,
                releasedAt: true,
              },
            },
            items: {
              take: 3,
              include: {
                product: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        reviews: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            buyer: {
              select: {
                name: true,
                email: true,
              },
            },
            order: {
              select: {
                orderNumber: true,
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
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Calculate revenue metrics
    const allPayments = await prisma.payment.findMany({
      where: {
        order: {
          shopId: shop.id,
        },
      },
      select: {
        amount: true,
        status: true,
        escrowStatus: true,
        releasedAt: true,
        createdAt: true,
      },
    })

    const totalRevenue = allPayments
      .filter((p) => p.status === 'RELEASED')
      .reduce((sum, p) => sum + p.amount, 0)

    const pendingRevenue = allPayments
      .filter((p) => p.escrowStatus === 'HELD' && p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0)

    const recentRevenue = allPayments
      .filter(
        (p) =>
          p.status === 'RELEASED' &&
          p.releasedAt &&
          p.releasedAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .reduce((sum, p) => sum + p.amount, 0)

    // Get disputes
    const disputes = await prisma.dispute.findMany({
      where: {
        order: {
          shopId: shop.id,
        },
      },
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        order: {
          select: {
            orderNumber: true,
            total: true,
          },
        },
        buyer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Calculate order statistics
    const orderStats = {
      total: shop._count.orders,
      delivered: await prisma.order.count({
        where: {
          shopId: shop.id,
          status: 'DELIVERED',
        },
      }),
      pending: await prisma.order.count({
        where: {
          shopId: shop.id,
          status: {
            in: ['PENDING', 'PAID', 'PREPARING', 'OUT_FOR_DELIVERY'],
          },
        },
      }),
      cancelled: await prisma.order.count({
        where: {
          shopId: shop.id,
          status: 'CANCELLED',
        },
      }),
      disputed: await prisma.order.count({
        where: {
          shopId: shop.id,
          status: 'DISPUTED',
        },
      }),
    }

    return NextResponse.json({
      shop: {
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
        seller: shop.user,
        stats: {
          totalProducts: shop._count.products,
          totalOrders: shop._count.orders,
          totalReviews: shop._count.reviews,
          totalRevenue,
          pendingRevenue,
          recentRevenue,
          orderStats,
        },
        products: shop.products,
        orders: shop.orders,
        reviews: shop.reviews,
        disputes,
      },
    })
  } catch (error: any) {
    console.error('Get shop details error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shop details' },
      { status: 500 }
    )
  }
}
