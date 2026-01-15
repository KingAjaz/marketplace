/**
 * Get Pending Seller Applications API
 * 
 * Returns all pending seller applications with user and shop information
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Get all pending seller applications with user and shop info in a single query
    const pendingApplications = await prisma.userRole.findMany({
      where: {
        role: 'SELLER',
        sellerStatus: 'PENDING',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            shop: {
              select: {
                id: true,
                name: true,
                description: true,
                address: true,
                city: true,
                state: true,
                createdAt: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Map to response format
    const applicationsWithShops = pendingApplications.map((app) => ({
      id: app.id,
      userId: app.userId,
      user: {
        id: app.user.id,
        name: app.user.name,
        email: app.user.email,
        phoneNumber: app.user.phoneNumber,
      },
      shop: app.user.shop,
      sellerStatus: app.sellerStatus,
      kycSubmitted: app.kycSubmitted,
      createdAt: app.createdAt.toISOString(),
    }))

    return NextResponse.json(applicationsWithShops, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('Get pending applications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
