/**
 * Rider Availability API
 * 
 * POST: Toggle rider online/offline status
 * GET: Get rider availability status
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

    // Get rider role
    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
        isActive: true,
      },
      select: {
        isOnline: true,
        riderStatus: true,
      },
    })

    if (!riderRole) {
      return NextResponse.json(
        { error: 'Rider role not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      isOnline: riderRole.isOnline || false,
      riderStatus: riderRole.riderStatus,
    })
  } catch (error: any) {
    console.error('Get rider availability error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability status' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isOnline } = await request.json()

    if (typeof isOnline !== 'boolean') {
      return NextResponse.json(
        { error: 'isOnline must be a boolean' },
        { status: 400 }
      )
    }

    // Get rider role
    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
        isActive: true,
      },
    })

    if (!riderRole) {
      return NextResponse.json(
        { error: 'Rider role not found' },
        { status: 404 }
      )
    }

    // Update availability status
    const updated = await prisma.userRole.update({
      where: { id: riderRole.id },
      data: { isOnline },
    })

    return NextResponse.json({
      message: isOnline ? 'You are now online' : 'You are now offline',
      isOnline: updated.isOnline,
    })
  } catch (error: any) {
    console.error('Update rider availability error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update availability status' },
      { status: 500 }
    )
  }
}
