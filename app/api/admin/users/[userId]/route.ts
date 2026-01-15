/**
 * Admin User Details API
 * 
 * GET: Get detailed information about a specific user including orders, reviews, disputes
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId } = await params

    // Get user with all related data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            description: true,
            address: true,
            city: true,
            state: true,
            isActive: true,
            rating: true,
            totalReviews: true,
            createdAt: true,
          },
        },
        orders: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            shop: {
              select: {
                name: true,
              },
            },
            payment: {
              select: {
                status: true,
                escrowStatus: true,
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
            order: {
              select: {
                orderNumber: true,
                shop: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        disputes: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
        addresses: {
          take: 10,
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            disputes: true,
            addresses: true,
            deliveries: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate total spent (sum of all completed orders)
    const completedOrders = await prisma.order.findMany({
      where: {
        buyerId: userId,
        status: 'DELIVERED',
      },
      select: {
        total: true,
      },
    })

    const totalSpent = completedOrders.reduce((sum, order) => sum + order.total, 0)

    // Format response
    const isSuspended = user.roles.length > 0 && user.roles.every((r) => !r.isActive)

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: user.roles.map((r) => ({
          role: r.role,
          isActive: r.isActive,
          sellerStatus: r.sellerStatus,
          riderStatus: r.riderStatus,
          createdAt: r.createdAt,
        })),
        shop: user.shop,
        stats: {
          totalOrders: user._count.orders,
          totalReviews: user._count.reviews,
          totalDisputes: user._count.disputes,
          totalAddresses: user._count.addresses,
          totalDeliveries: user._count.deliveries,
          totalSpent,
        },
        orders: user.orders,
        reviews: user.reviews,
        disputes: user.disputes,
        addresses: user.addresses,
        isSuspended,
      },
    })
  } catch (error: any) {
    console.error('Get user details error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch user details' },
      { status: 500 }
    )
  }
}
