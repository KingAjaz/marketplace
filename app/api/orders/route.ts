/**
 * Orders API
 * GET: Get all orders for the current buyer
 * POST: Create new order and initialize payment
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateOrderNumber, calculatePlatformFee } from '@/lib/utils'
import { calculateDistance } from '@/lib/distance'
import { OrderStatus, PaymentStatus, EscrowStatus, DeliveryStatus } from '@prisma/client'
import { updateStock } from '@/lib/inventory'
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // Filter by order status
    const shopId = searchParams.get('shopId') // Filter by shop
    const search = searchParams.get('search') // Search by order number
    const startDate = searchParams.get('startDate') // Date range start
    const endDate = searchParams.get('endDate') // Date range end
    const sortBy = searchParams.get('sortBy') || 'newest' // newest, oldest, amount_high, amount_low
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {
      buyerId: session.user.id,
    }

    if (status && status !== 'ALL') {
      where.status = status as OrderStatus
    }

    if (shopId) {
      where.shopId = shopId
    }

    if (search) {
      where.orderNumber = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        // Add one day to include the end date
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.createdAt.lt = end
      }
    }

    // Build orderBy clause
    let orderBy: any = {}
    switch (sortBy) {
      case 'oldest':
        orderBy = { createdAt: 'asc' }
        break
      case 'amount_high':
        orderBy = { total: 'desc' }
        break
      case 'amount_low':
        orderBy = { total: 'asc' }
        break
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' }
        break
    }

    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
              pricingUnit: {
                select: {
                  unit: true,
                },
              },
            },
            take: 5, // Limit items for list view
          },
          payment: {
            select: {
              status: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ])

    // Get unique shops for filter dropdown
    const shopOrders = await prisma.order.findMany({
      where: {
        buyerId: session.user.id,
      },
      select: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Extract unique shops
    const shopMap = new Map<string, { id: string; name: string }>()
    shopOrders.forEach((order) => {
      if (order.shop && !shopMap.has(order.shop.id)) {
        shopMap.set(order.shop.id, order.shop)
      }
    })
    const uniqueShops = Array.from(shopMap.values())

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      shops: uniqueShops,
    })
  } catch (error) {
    console.error('Get orders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
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

    // Rate limiting for order creation
    const { checkRateLimit, rateLimiters } = await import('@/lib/rate-limit')
    const rateLimitResult = await checkRateLimit(request, rateLimiters.payment, session.user.id)
    if (!rateLimitResult.success) {
      return rateLimitResult.response as NextResponse
    }

    // Phone number is required for placing orders (for delivery contact)
    if (!session.user.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required. Please complete your profile first.' },
        { status: 400 }
      )
    }

    const { 
      items, 
      deliveryAddress, 
      deliveryCity, 
      deliveryState, 
      deliveryPhone, 
      notes,
      deliveryLatitude,
      deliveryLongitude,
    } = await request.json()

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Cart is empty' },
        { status: 400 }
      )
    }

    if (!deliveryAddress || !deliveryCity || !deliveryState || !deliveryPhone) {
      return NextResponse.json(
        { error: 'Delivery information is required' },
        { status: 400 }
      )
    }

    // Group items by shop (one order per shop)
    const itemsByShop = items.reduce((acc: any, item: any) => {
      if (!acc[item.shopId]) {
        acc[item.shopId] = []
      }
      acc[item.shopId].push(item)
      return acc
    }, {})

    const orders = []

    // Create order for each shop
    for (const [shopId, shopItems] of Object.entries(itemsByShop)) {
      // Get shop to check if it's open
      const shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { operatingHours: true, name: true },
      })

      if (!shop) {
        return NextResponse.json(
          { error: 'Shop not found' },
          { status: 404 }
        )
      }

      // Check if shop is currently open
      if (shop.operatingHours) {
        const { isShopOpen } = await import('@/lib/shop-hours')
        if (!isShopOpen(shop.operatingHours)) {
          return NextResponse.json(
            { error: `${shop.name} is currently closed. Please try again during operating hours.` },
            { status: 400 }
          )
        }
      }

      // Calculate totals
      let subtotal = 0
      const orderItems = []

      for (const item of shopItems as any[]) {
        // Verify product and pricing unit exist
        const pricingUnit = await prisma.pricingUnit.findUnique({
          where: { id: item.pricingUnitId },
          include: { product: true },
        })

        if (!pricingUnit || pricingUnit.product.shopId !== shopId) {
          return NextResponse.json(
            { error: `Invalid product: ${item.productName}` },
            { status: 400 }
          )
        }

        // Check stock availability if stock is tracked
        if (pricingUnit.stock !== null) {
          if (pricingUnit.stock < item.quantity) {
            return NextResponse.json(
              { error: `Insufficient stock for ${item.productName}. Available: ${pricingUnit.stock} ${pricingUnit.unit}` },
              { status: 400 }
            )
          }
        }

        const itemTotal = pricingUnit.price * item.quantity
        subtotal += itemTotal

        orderItems.push({
          productId: item.productId,
          pricingUnitId: item.pricingUnitId,
          quantity: item.quantity,
          unitPrice: pricingUnit.price,
          total: itemTotal,
        })
      }

      const platformFee = calculatePlatformFee(subtotal)
      
      // Calculate delivery fee based on distance if coordinates provided
      const { calculateDeliveryFeeFromCoordinates } = await import('@/lib/delivery-fee')
      let deliveryFee = 500 // Default fee
      if (deliveryLatitude && deliveryLongitude) {
        // Get shop location
        const shop = await prisma.shop.findUnique({
          where: { id: shopId },
          select: { latitude: true, longitude: true },
        })
        
        const calculatedFee = calculateDeliveryFeeFromCoordinates(
          shop?.latitude,
          shop?.longitude,
          deliveryLatitude,
          deliveryLongitude
        )
        
        if (calculatedFee !== null) {
          deliveryFee = calculatedFee
        }
      }
      
      const total = subtotal + platformFee + deliveryFee

      // Update stock for all items (reserve stock) - will be done after order creation
      const stockUpdates: Array<{ pricingUnitId: string; quantity: number }> = []
      for (const item of shopItems as any[]) {
        const pricingUnit = await prisma.pricingUnit.findUnique({
          where: { id: item.pricingUnitId },
        })

        if (pricingUnit && pricingUnit.stock !== null) {
          stockUpdates.push({
            pricingUnitId: item.pricingUnitId,
            quantity: -item.quantity, // Negative to decrease stock
          })
        }
      }

      // Create order
      console.log('Creating order for shop:', shopId, 'Buyer:', session.user.id, 'Total:', total)
      const order = await prisma.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          buyerId: session.user.id,
          shopId,
          status: OrderStatus.PENDING,
          subtotal,
          platformFee,
          deliveryFee,
          total,
          deliveryAddress,
          deliveryCity,
          deliveryState,
          deliveryPhone,
          deliveryLatitude: deliveryLatitude || null,
          deliveryLongitude: deliveryLongitude || null,
          notes,
          items: {
            create: orderItems,
          },
          payment: {
            create: {
              amount: total,
              status: PaymentStatus.PENDING,
              escrowStatus: EscrowStatus.HELD,
            },
          },
          delivery: {
            create: {
              status: DeliveryStatus.PENDING,
            },
          },
        },
        include: {
          shop: {
            select: {
              name: true,
              userId: true,
            },
          },
        },
      })

      console.log('Order created successfully:', { orderId: order.id, orderNumber: order.orderNumber, buyerId: order.buyerId })
      orders.push(order)

      // Update stock after order creation (with history tracking)
      for (const stockUpdate of stockUpdates) {
        try {
          await updateStock(
            stockUpdate.pricingUnitId,
            stockUpdate.quantity,
            StockChangeType.ORDER_PLACED,
            order.id,
            `Stock reserved for order ${order.orderNumber}`
          )
        } catch (error) {
          console.error(`Failed to update stock for pricing unit ${stockUpdate.pricingUnitId}:`, error)
          // Don't fail the order creation if stock update fails, but log it
        }
      }

      // Create notifications
      if (order.shop?.userId) {
        const { notifyOrderPlaced } = await import('@/lib/notifications')
        await notifyOrderPlaced(order.id, session.user.id, order.shop.userId, order.orderNumber).catch((error) => {
          console.error('Failed to send order notifications:', error)
          // Don't fail the order creation if notification fails
        })
      }
    }

    // Validate that at least one order was created
    if (orders.length === 0) {
      console.error('Order creation failed: orders array is empty')
      return NextResponse.json(
        { error: 'No orders were created. Please try again.' },
        { status: 500 }
      )
    }

    // For multiple orders, we need to handle payment differently
    // For now, return the first order (user will pay for each order separately)
    const firstOrder = orders[0]
    
    if (!firstOrder || !firstOrder.id) {
      console.error('Order creation failed: first order is invalid', { orders, firstOrder })
      return NextResponse.json(
        { error: 'Order was created but order ID is missing. Please contact support.' },
        { status: 500 }
      )
    }

    // Fetch the full first order to return complete details
    const fullOrder = await prisma.order.findUnique({
      where: { id: firstOrder.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            userId: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
            pricingUnit: {
              select: {
                id: true,
                unit: true,
                price: true,
              },
            },
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            escrowStatus: true,
          },
        },
      },
    })

    if (!fullOrder) {
      console.error('Order creation succeeded but order not found in database', { orderId: firstOrder.id })
      return NextResponse.json(
        { error: 'Order was created but could not be retrieved. Please check your orders page.' },
        { status: 500 }
      )
    }

    console.log('Order created successfully:', { orderId: fullOrder.id, orderNumber: fullOrder.orderNumber, totalOrders: orders.length })
    
    // Return the full first order for payment page
    return NextResponse.json({
      message: orders.length > 1 
        ? `Orders created successfully. You have ${orders.length} order(s) to pay for. Starting with the first order.` 
        : 'Order created successfully',
      orders,
      // Return the full order with all necessary fields for payment page
      order: {
        id: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
        status: fullOrder.status,
        total: fullOrder.total,
        shop: fullOrder.shop,
        items: fullOrder.items,
        payment: fullOrder.payment,
      },
    }, { status: 201 }) // Use 201 Created status for successful creation
  } catch (error: any) {
    console.error('Create order error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create order'
    let statusCode = 500
    
    if (error.code === 'P2002') {
      errorMessage = 'A duplicate order was detected. Please try again.'
      statusCode = 409
    } else if (error.code === 'P2025') {
      errorMessage = 'Product or shop not found. Please refresh and try again.'
      statusCode = 404
    } else if (error.message?.includes('stock')) {
      errorMessage = error.message
      statusCode = 400
    } else if (error.message?.includes('Invalid')) {
      errorMessage = error.message
      statusCode = 400
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
