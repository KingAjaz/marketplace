/**
 * Product Stock Management API
 * 
 * PATCH: Update stock for pricing units
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { pricingUnits } = await request.json()

    if (!pricingUnits || !Array.isArray(pricingUnits)) {
      return NextResponse.json(
        { error: 'Pricing units array is required' },
        { status: 400 }
      )
    }

    // Verify product belongs to seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        shopId: shop.id,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Update stock for each pricing unit
    const updates = pricingUnits.map((unit: { id: string; stock: number | null }) =>
      prisma.pricingUnit.update({
        where: {
          id: unit.id,
          productId: id, // Ensure it belongs to this product
        },
        data: {
          stock: unit.stock === null || unit.stock < 0 ? null : unit.stock,
        },
      })
    )

    await Promise.all(updates)

    return NextResponse.json({
      message: 'Stock updated successfully',
    })
  } catch (error: any) {
    console.error('Update stock error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update stock' },
      { status: 500 }
    )
  }
}
