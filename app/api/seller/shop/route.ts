/**
 * Seller Shop API
 * 
 * GET: Get shop information
 * PATCH: Update shop information
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

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
    }

    return NextResponse.json({ shop })
  } catch (error) {
    console.error('Get shop error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shop' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { name, description, address, city, state, logo, banner, operatingHours } = body

    // Update shop
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: {
        name: name?.trim() || shop.name,
        description: description?.trim() || shop.description,
        address: address?.trim() || shop.address,
        city: city?.trim() || shop.city,
        state: state?.trim() || shop.state,
        logo: logo?.trim() || shop.logo,
        banner: banner?.trim() || shop.banner,
        operatingHours: operatingHours || shop.operatingHours,
      },
    })

    return NextResponse.json({ shop: updated })
  } catch (error: any) {
    console.error('Update shop error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update shop' },
      { status: 500 }
    )
  }
}
