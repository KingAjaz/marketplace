/**
 * Stock History API
 * Get stock history for a specific pricing unit
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStockHistory } from '@/lib/inventory'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pricingUnitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { pricingUnitId } = await params

    // Verify the pricing unit belongs to the seller's shop
    const pricingUnit = await prisma.pricingUnit.findUnique({
      where: { id: pricingUnitId },
      include: {
        product: {
          include: {
            shop: {
              select: { userId: true },
            },
          },
        },
      },
    })

    if (!pricingUnit) {
      return NextResponse.json(
        { error: 'Pricing unit not found' },
        { status: 404 }
      )
    }

    // Verify user is a seller and owns this product
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: true,
        sellerStatus: 'APPROVED',
      },
    })

    if (!userRole || pricingUnit.product.shop.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get stock history
    const history = await getStockHistory(pricingUnitId, 100)

    return NextResponse.json({ history })
  } catch (error: any) {
    console.error('Stock history API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock history' },
      { status: 500 }
    )
  }
}
