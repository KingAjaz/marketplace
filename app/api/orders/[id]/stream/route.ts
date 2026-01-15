/**
 * Order Updates Stream (Server-Sent Events)
 * 
 * Provides real-time order status updates via SSE
 */
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  // Verify user has access to this order
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      buyerId: true,
      shop: {
        select: {
          userId: true,
        },
      },
    },
  })

  if (!order) {
    return new Response('Order not found', { status: 404 })
  }

  const isBuyer = order.buyerId === session.user.id
  const isSeller = order.shop.userId === session.user.id

  // Check if user is admin
  let isAdmin = false
  if (!isBuyer && !isSeller) {
    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })
    isAdmin = !!adminRole
  }

  if (!isBuyer && !isSeller && !isAdmin) {
    return new Response('Unauthorized', { status: 403 })
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      const send = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(message))
      }

      send({ type: 'connected', message: 'Connected to order updates stream' })

      // Poll for order updates every 2 seconds
      let lastStatus: string | null = null
      let lastDeliveryStatus: string | null = null
      let lastRiderLatitude: number | null = null
      let lastRiderLongitude: number | null = null

      const pollInterval = setInterval(async () => {
        try {
          const currentOrder = await prisma.order.findUnique({
            where: { id },
            include: {
              delivery: {
                include: {
                  rider: {
                    select: {
                      id: true,
                      name: true,
                      phoneNumber: true,
                    },
                  },
                },
              },
              payment: {
                select: {
                  status: true,
                  escrowStatus: true,
                },
              },
            },
          })

          if (!currentOrder) {
            clearInterval(pollInterval)
            controller.close()
            return
          }

          // Check for status changes
          if (currentOrder.status !== lastStatus) {
            lastStatus = currentOrder.status
            send({
              type: 'order_status_update',
              orderId: id,
              status: currentOrder.status,
              order: {
                id: currentOrder.id,
                orderNumber: currentOrder.orderNumber,
                status: currentOrder.status,
                deliveredAt: currentOrder.deliveredAt,
              },
            })
          }

          // Check for delivery status changes
          if (currentOrder.delivery) {
            if (currentOrder.delivery.status !== lastDeliveryStatus) {
              lastDeliveryStatus = currentOrder.delivery.status
              send({
                type: 'delivery_status_update',
                orderId: id,
                deliveryId: currentOrder.delivery.id,
                status: currentOrder.delivery.status,
                rider: currentOrder.delivery.rider,
                pickedUpAt: currentOrder.delivery.pickedUpAt,
                deliveredAt: currentOrder.delivery.deliveredAt,
              })
            }

            // Check for rider location updates (only if in transit)
            if (
              currentOrder.delivery.status === 'IN_TRANSIT' &&
              currentOrder.delivery.riderLatitude !== null &&
              currentOrder.delivery.riderLongitude !== null
            ) {
              if (
                currentOrder.delivery.riderLatitude !== lastRiderLatitude ||
                currentOrder.delivery.riderLongitude !== lastRiderLongitude
              ) {
                lastRiderLatitude = currentOrder.delivery.riderLatitude
                lastRiderLongitude = currentOrder.delivery.riderLongitude
                send({
                  type: 'rider_location_update',
                  orderId: id,
                  deliveryId: currentOrder.delivery.id,
                  latitude: currentOrder.delivery.riderLatitude,
                  longitude: currentOrder.delivery.riderLongitude,
                })
              }
            }
          }

          // Check for payment status changes
          if (currentOrder.payment) {
            // Payment status is checked but not sent unless changed
            // This can be extended if needed
          }
        } catch (error) {
          console.error('Error polling order updates:', error)
          send({ type: 'error', message: 'Failed to fetch updates' })
        }
      }, 2000) // Poll every 2 seconds

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  })
}
