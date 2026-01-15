/**
 * Get Available Riders API
 * 
 * Returns all approved riders for delivery assignment
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

    // Get all approved riders
    const riderRoles = await prisma.userRole.findMany({
      where: {
        role: 'RIDER',
        riderStatus: 'APPROVED',
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get active delivery counts for each rider
    const ridersWithStats = await Promise.all(
      riderRoles.map(async (role) => {
        const activeDeliveries = await prisma.delivery.count({
          where: {
            riderId: role.userId,
            status: {
              in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
            },
          },
        })

        const completedDeliveries = await prisma.delivery.count({
          where: {
            riderId: role.userId,
            status: 'DELIVERED',
          },
        })

        return {
          id: role.userId,
          name: role.user.name,
          email: role.user.email,
          phoneNumber: role.user.phoneNumber,
          activeDeliveries,
          completedDeliveries,
        }
      })
    )

    return NextResponse.json({ riders: ridersWithStats })
  } catch (error: any) {
    console.error('Get available riders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch riders' },
      { status: 500 }
    )
  }
}
