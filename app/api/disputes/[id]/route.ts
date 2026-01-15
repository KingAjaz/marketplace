/**
 * Single Dispute API
 * 
 * GET: Get dispute details
 * PATCH: Update dispute (add notes, respond)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DisputeStatus } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: true,
                  },
                },
                pricingUnit: {
                  select: {
                    unit: true,
                  },
                },
              },
            },
            shop: {
              select: {
                name: true,
              },
            },
            buyer: {
              select: {
                name: true,
                email: true,
              },
            },
            payment: {
              select: {
                amount: true,
                status: true,
                escrowStatus: true,
              },
            },
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      )
    }

    // Verify user has access (buyer, seller, or admin)
    const isBuyer = dispute.buyerId === session.user.id
    const isSeller = dispute.sellerId === session.user.id

    if (!isBuyer && !isSeller) {
      // Check if admin
      const adminRole = await prisma.userRole.findFirst({
        where: {
          userId: session.user.id,
          role: 'ADMIN',
          isActive: true,
        },
      })

      if (!adminRole) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ dispute })
  } catch (error: any) {
    console.error('Get dispute error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dispute' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { sellerNotes, buyerNotes, adminNotes, status, resolution } = await request.json()

    const dispute = await prisma.dispute.findUnique({
      where: { id },
    })

    if (!dispute) {
      return NextResponse.json(
        { error: 'Dispute not found' },
        { status: 404 }
      )
    }

    const isBuyer = dispute.buyerId === session.user.id
    const isSeller = dispute.sellerId === session.user.id

    // Check if admin
    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    const isAdmin = !!adminRole

    // Build update data
    const updateData: any = {}

    if (isSeller && sellerNotes !== undefined) {
      updateData.sellerNotes = sellerNotes?.trim() || null
    }

    if (isBuyer && buyerNotes !== undefined) {
      updateData.buyerNotes = buyerNotes?.trim() || null
    }

    if (isAdmin) {
      if (adminNotes !== undefined) {
        updateData.adminNotes = adminNotes?.trim() || null
      }
      if (status && Object.values(DisputeStatus).includes(status)) {
        updateData.status = status
        if (status === 'RESOLVED' && resolution) {
          updateData.resolution = resolution
          updateData.resolvedAt = new Date()
        }
      }
      if (resolution) {
        updateData.resolution = resolution
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      )
    }

    const updated = await prisma.dispute.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      message: 'Dispute updated successfully',
      dispute: updated,
    })
  } catch (error: any) {
    console.error('Update dispute error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update dispute' },
      { status: 500 }
    )
  }
}
