/**
 * Admin Riders API
 * 
 * GET: Get all riders with optional status filtering
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // PENDING, APPROVED, SUSPENDED, REJECTED, or null for all

    // Build where clause
    const where: any = {
      role: 'RIDER',
    }

    if (status) {
      where.riderStatus = status
    }

    const riders = await prisma.userRole.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get statistics for each rider
    const ridersWithStats = await Promise.all(
      riders.map(async (riderRole) => {
        const activeDeliveries = await prisma.delivery.count({
          where: {
            riderId: riderRole.userId,
            status: {
              in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'],
            },
          },
        })

        const completedDeliveries = await prisma.delivery.count({
          where: {
            riderId: riderRole.userId,
            status: 'DELIVERED',
          },
        })

        const failedDeliveries = await prisma.delivery.count({
          where: {
            riderId: riderRole.userId,
            status: 'FAILED',
          },
        })

        return {
          id: riderRole.id,
          userId: riderRole.userId,
          name: riderRole.user.name,
          email: riderRole.user.email,
          phoneNumber: riderRole.user.phoneNumber,
          riderStatus: riderRole.riderStatus,
          isActive: riderRole.isActive,
          rejectionReason: riderRole.rejectionReason,
          createdAt: riderRole.createdAt,
          updatedAt: riderRole.updatedAt,
          userCreatedAt: riderRole.user.createdAt,
          stats: {
            activeDeliveries,
            completedDeliveries,
            failedDeliveries,
            totalDeliveries: activeDeliveries + completedDeliveries + failedDeliveries,
          },
        }
      })
    )

    // Get counts for each status
    const counts = {
      pending: await prisma.userRole.count({
        where: { role: 'RIDER', riderStatus: 'PENDING' },
      }),
      approved: await prisma.userRole.count({
        where: { role: 'RIDER', riderStatus: 'APPROVED', isActive: true },
      }),
      suspended: await prisma.userRole.count({
        where: { role: 'RIDER', riderStatus: 'SUSPENDED' },
      }),
      rejected: await prisma.userRole.count({
        where: { role: 'RIDER', riderStatus: 'REJECTED' },
      }),
      total: await prisma.userRole.count({
        where: { role: 'RIDER' },
      }),
    }

    return NextResponse.json({
      riders: ridersWithStats,
      counts,
    })
  } catch (error: any) {
    console.error('Get riders error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch riders' },
      { status: 500 }
    )
  }
}
