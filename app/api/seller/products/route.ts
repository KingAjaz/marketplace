/**
 * Seller Products API
 * 
 * GET: List all products for the seller's shop
 * POST: Create a new product
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    // Get all products for this shop
    const products = await prisma.product.findMany({
      where: { shopId: shop.id },
      include: {
        pricingUnits: {
          orderBy: { price: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Get products error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch products' },
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

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    const { name, description, category, images, pricingUnits } = await request.json()

    if (!name || !category || !pricingUnits || pricingUnits.length === 0) {
      return NextResponse.json(
        { error: 'Name, category, and at least one pricing unit are required' },
        { status: 400 }
      )
    }

    // Create product with pricing units
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: name.trim(),
        description: description?.trim() || null,
        category: category as ProductCategory,
        images: images.filter((img: string) => img.trim()),
        pricingUnits: {
          create: pricingUnits.map((unit: any) => ({
            unit: unit.unit.trim(),
            price: Number(unit.price),
            stock: unit.stock ? Number(unit.stock) : null,
            isActive: true,
          })),
        },
      },
      include: {
        pricingUnits: true,
      },
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error: any) {
    console.error('Create product error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create product' },
      { status: 500 }
    )
  }
}
