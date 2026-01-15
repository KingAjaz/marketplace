/**
 * Admin Reject Rider API
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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
    const { reason } = await request.json()

    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role: 'RIDER',
      },
    })

    if (!riderRole) {
      return NextResponse.json(
        { error: 'Rider application not found' },
        { status: 404 }
      )
    }

    await prisma.userRole.update({
      where: { id: riderRole.id },
      data: {
        riderStatus: 'REJECTED',
        isActive: false,
        rejectionReason: reason || null,
      },
    })

    return NextResponse.json({
      message: 'Rider application rejected',
    })
  } catch (error: any) {
    console.error('Reject rider error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reject rider' },
      { status: 500 }
    )
  }
}
