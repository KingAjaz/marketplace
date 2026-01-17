/**
export const dynamic = 'force-dynamic'
 * Admin Users API
 * 
 * GET: Get all users with filters (role, status, registration date)
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
    const role = searchParams.get('role') // BUYER, SELLER, RIDER, ADMIN
    const status = searchParams.get('status') // active, suspended, all
    const search = searchParams.get('search') // Search by name or email
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause for users
    const userWhere: any = {}
    
    if (search) {
      userWhere.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (startDate || endDate) {
      userWhere.createdAt = {}
      if (startDate) {
        userWhere.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        userWhere.createdAt.lte = new Date(endDate)
      }
    }

    // Get all users with their roles
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        roles: {
          include: {
            user: false, // Avoid circular reference
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            disputes: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })

    // Filter by role and status
    let filteredUsers = users

    if (role) {
      filteredUsers = filteredUsers.filter((user) =>
        user.roles.some((r) => r.role === role)
      )
    }

    if (status === 'suspended') {
      // User is suspended if all their roles are inactive
      filteredUsers = filteredUsers.filter((user) =>
        user.roles.length > 0 && user.roles.every((r) => !r.isActive)
      )
    } else if (status === 'active') {
      // User is active if at least one role is active
      filteredUsers = filteredUsers.filter((user) =>
        user.roles.some((r) => r.isActive)
      )
    }

    // Format response
    const formattedUsers = filteredUsers.map((user) => {
      const roles = user.roles.map((r) => ({
        role: r.role,
        isActive: r.isActive,
        sellerStatus: r.sellerStatus,
        riderStatus: r.riderStatus,
        createdAt: r.createdAt,
      }))

      const isSuspended = user.roles.length > 0 && user.roles.every((r) => !r.isActive)
      const isActive = user.roles.some((r) => r.isActive)

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        image: user.image,
        createdAt: user.createdAt,
        roles,
        shop: user.shop,
        stats: {
          totalOrders: user._count.orders,
          totalReviews: user._count.reviews,
          totalDisputes: user._count.disputes,
        },
        isSuspended,
        isActive,
      }
    })

    // Get total count for pagination
    const totalCount = await prisma.user.count({
      where: userWhere,
    })

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error: any) {
    console.error('Get admin users error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
