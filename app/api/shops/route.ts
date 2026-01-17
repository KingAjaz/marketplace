/**
export const dynamic = 'force-dynamic'
 * Shops API
 * Get all active shops with product counts and ratings
 * Supports distance-based sorting when user location is provided
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDistance } from '@/lib/distance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null

    console.log('[Shops API] Fetching shops - search:', search, 'location:', userLat, userLng)

    // First, let's check ALL shops to see what we have
    const allShops = await prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
            roles: {
              where: { role: 'SELLER' },
              select: {
                id: true,
                isActive: true,
                sellerStatus: true,
              },
            },
          },
        },
      },
    })

    console.log(`[Shops API] Total shops in database: ${allShops.length}`)
    allShops.forEach((shop) => {
      console.log(`[Shops API] Shop: ${shop.name}, isActive: ${shop.isActive}, Seller Role:`, shop.user.roles[0] || 'NO SELLER ROLE')
    })

    // Use a simpler approach: fetch all active shops and filter by seller status
    const where: any = {
      isActive: true,
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch shops with user and roles included
    const shopsRaw = await prisma.shop.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        logo: true,
        banner: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        rating: true,
        totalReviews: true,
        user: {
          select: {
            id: true,
            roles: {
              where: {
                role: 'SELLER',
              },
              select: {
                id: true,
                role: true,
                isActive: true,
                sellerStatus: true,
              },
            },
          },
        },
        _count: {
          select: {
            products: {
              where: {
                isAvailable: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`[Shops API] Raw shops fetched: ${shopsRaw.length}`)

    // Filter shops that have approved seller role
    // Note: roles array is already filtered to only SELLER roles in the query
    const shops = shopsRaw.filter((shop) => {
      const sellerRole = shop.user.roles[0] // First role should be SELLER (only one in array)
      const isApproved = sellerRole?.isActive === true && sellerRole?.sellerStatus === 'APPROVED'
      console.log(`[Shops API] Shop "${shop.name}": sellerRole exists: ${!!sellerRole}, isActive: ${sellerRole?.isActive}, status: ${sellerRole?.sellerStatus}, approved: ${isApproved}`)
      if (!sellerRole) {
        console.log(`[Shops API] WARNING: Shop "${shop.name}" has no seller role!`)
      }
      return isApproved
    })

    console.log(`[Shops API] After filtering: ${shops.length} shops`)

    console.log(`[Shops API] Found ${shops.length} shops matching criteria (isActive=true, seller APPROVED)`)
    
    if (shops.length === 0) {
      console.log('[Shops API] DEBUG: No shops found. Checking why...')
      // Check shops that are active but might not have approved seller
      const activeShopsNotApproved = await prisma.shop.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          user: {
            select: {
              roles: {
                where: { role: 'SELLER' },
                select: {
                  isActive: true,
                  sellerStatus: true,
                },
              },
            },
          },
        },
      })
      console.log(`[Shops API] Active shops (may not be approved): ${activeShopsNotApproved.length}`)
      activeShopsNotApproved.forEach((shop) => {
        console.log(`[Shops API] - ${shop.name}: Seller status:`, shop.user.roles[0]?.sellerStatus || 'NO SELLER ROLE', 'isActive:', shop.user.roles[0]?.isActive)
      })
    }

    // Format response with product count and calculate distances
    let shopsWithCounts = shops.map((shop) => {
      let distance: number | null = null

      // Calculate distance if user location and shop location are available
      if (userLat && userLng && shop.latitude && shop.longitude) {
        distance = calculateDistance(userLat, userLng, shop.latitude, shop.longitude)
      }

      return {
        id: shop.id,
        name: shop.name,
        description: shop.description,
        logo: shop.logo,
        banner: shop.banner,
        address: shop.address,
        city: shop.city,
        state: shop.state,
        latitude: shop.latitude,
        longitude: shop.longitude,
        rating: shop.rating,
        totalReviews: shop.totalReviews,
        productCount: shop._count.products,
        distance, // Distance in kilometers, null if not calculable
      }
    })

    // Sort by distance if user location is provided
    // Shops WITH distance come first (sorted nearest to farthest)
    // Shops WITHOUT distance come after (sorted by creation date)
    // This ensures ALL shops are shown, just prioritized by proximity
    if (userLat && userLng) {
      shopsWithCounts.sort((a, b) => {
        // Both have distance - sort by distance (nearest first)
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance
        }
        // Only a has distance - a comes first
        if (a.distance !== null) return -1
        // Only b has distance - b comes first
        if (b.distance !== null) return 1
        // Neither has distance - maintain original order (by creation date)
        return 0
      })
    }

    console.log(`[Shops API] Returning ${shopsWithCounts.length} shops`)

    return NextResponse.json(
      { shops: shopsWithCounts },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    )
  } catch (error) {
    console.error('[Shops API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch shops',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
