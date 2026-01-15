/**
 * Seller Inventory Management API
 * 
 * GET: Get low stock items and inventory overview
 * POST: Update stock for a pricing unit
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLowStockItems, getStockHistory, updateStock } from '@/lib/inventory'
import { StockChangeType } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a seller
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: true,
        sellerStatus: 'APPROVED',
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'You must be an approved seller to access inventory' },
        { status: 403 }
      )
    }

    // Get low stock items
    const lowStockItems = await getLowStockItems(session.user.id)

    // Get shop for inventory overview
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
      include: {
        products: {
          include: {
            pricingUnits: {
              where: {
                stock: { not: null },
                isActive: true,
              },
            },
          },
        },
      },
    })

    // Calculate inventory stats
    let totalProducts = 0
    let totalStockItems = 0
    let totalStockValue = 0
    let outOfStockItems = 0

    if (shop) {
      for (const product of shop.products) {
        for (const pricingUnit of product.pricingUnits) {
          if (pricingUnit.stock !== null) {
            totalStockItems++
            totalStockValue += pricingUnit.price * pricingUnit.stock
            if (pricingUnit.stock === 0) {
              outOfStockItems++
            }
          }
        }
      }
      totalProducts = shop.products.length
    }

    return NextResponse.json({
      lowStockItems,
      overview: {
        totalProducts,
        totalStockItems,
        totalStockValue,
        outOfStockItems,
        lowStockCount: lowStockItems.length,
      },
    })
  } catch (error: any) {
    console.error('Inventory API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch inventory data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a seller
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: true,
        sellerStatus: 'APPROVED',
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'You must be an approved seller to manage inventory' },
        { status: 403 }
      )
    }

    const { pricingUnitId, stock, lowStockThreshold } = await request.json()

    if (!pricingUnitId) {
      return NextResponse.json(
        { error: 'Pricing unit ID is required' },
        { status: 400 }
      )
    }

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

    if (pricingUnit.product.shop.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized to update this pricing unit' },
        { status: 403 }
      )
    }

    // Update stock if provided
    if (stock !== undefined) {
      const currentStock = pricingUnit.stock ?? 0
      const stockDifference = stock - currentStock

      if (stockDifference !== 0) {
        await updateStock(
          pricingUnitId,
          stockDifference,
          stockDifference > 0 ? StockChangeType.RESTOCKED : StockChangeType.MANUAL_UPDATE,
          undefined,
          stockDifference > 0 ? 'Manual restocking' : 'Manual stock adjustment'
        )
      }
    }

    // Update low stock threshold if provided
    const updateData: any = {}
    if (lowStockThreshold !== undefined) {
      updateData.lowStockThreshold = lowStockThreshold >= 0 ? lowStockThreshold : null
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.pricingUnit.update({
        where: { id: pricingUnitId },
        data: updateData,
      })
    }

    // Get updated pricing unit
    const updatedPricingUnit = await prisma.pricingUnit.findUnique({
      where: { id: pricingUnitId },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Inventory updated successfully',
      pricingUnit: updatedPricingUnit,
    })
  } catch (error: any) {
    console.error('Update inventory error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update inventory' },
      { status: 500 }
    )
  }
}
