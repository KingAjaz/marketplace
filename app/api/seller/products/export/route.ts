/**
 * Export Products to CSV API
 * 
 * Exports seller's products to CSV format
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
      include: {
        products: {
          include: {
            pricingUnits: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    // Generate CSV
    const csvRows: string[] = []
    
    // CSV Header
    csvRows.push('Name,Description,Category,Images,Unit,Price,Stock,LowStockThreshold,IsAvailable')

    // CSV Rows
    for (const product of shop.products) {
      if (product.pricingUnits.length === 0) {
        // Product without pricing units
        csvRows.push(
          `"${product.name}","${product.description || ''}","${product.category}","${product.images.join(';')}",,,,,"${product.isAvailable}"`
        )
      } else {
        // One row per pricing unit
        for (const pricingUnit of product.pricingUnits) {
          csvRows.push(
            `"${product.name}","${product.description || ''}","${product.category}","${product.images.join(';')}","${pricingUnit.unit}","${pricingUnit.price}","${pricingUnit.stock || ''}","${pricingUnit.lowStockThreshold || ''}","${product.isAvailable}"`
          )
        }
      }
    }

    const csv = csvRows.join('\n')

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="products-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error: any) {
    console.error('Export products error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export products' },
      { status: 500 }
    )
  }
}
