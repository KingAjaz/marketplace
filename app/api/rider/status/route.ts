/**
export const dynamic = 'force-dynamic'
 * Rider Application Status API
 * 
 * Returns the current status of user's rider application
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const riderRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
      },
    })

    if (!riderRole) {
      return NextResponse.json({
        status: 'none',
      })
    }

    return NextResponse.json({
      status: riderRole.riderStatus?.toLowerCase() || 'none',
      isActive: riderRole.isActive,
    })
  } catch (error) {
    console.error('Get rider application status error:', error)
    return NextResponse.json(
      { error: 'Failed to get application status' },
      { status: 500 }
    )
  }
}
