/**
 * Payment Verification API
 * Verify Paystack payment and update order status
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyPaystackPayment } from '@/lib/paystack'
import { PaymentStatus, OrderStatus, DeliveryStatus, NotificationType } from '@prisma/client'
import { calculateDistance } from '@/lib/distance'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { reference } = await request.json()

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.buyerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    // Verify payment with Paystack
    try {
      const paystackResponse = await verifyPaystackPayment(reference)

      if (!paystackResponse.status || !paystackResponse.data) {
        return NextResponse.json(
          { error: paystackResponse.message || 'Payment verification failed' },
          { status: 400 }
        )
      }

      // Check if payment was successful
      if (paystackResponse.data.status !== 'success') {
        return NextResponse.json(
          { error: `Payment ${paystackResponse.data.status}. ${paystackResponse.message}` },
          { status: 400 }
        )
      }

      // Check if payment already verified to avoid duplicate processing
      if (order.payment?.status === PaymentStatus.COMPLETED) {
        console.log('Payment already verified, returning existing order')
        const existingOrder = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            shop: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })

        return NextResponse.json({
          message: 'Payment already verified',
          order: existingOrder,
        })
      }

      // Verify the amount matches
      const paidAmount = paystackResponse.data.amount / 100 // Convert from kobo to Naira
      if (Math.abs(paidAmount - order.total) > 0.01) {
        console.warn(
          `Amount mismatch: Order total ${order.total}, Paid ${paidAmount}`
        )
        // Still proceed, but log the warning
      }

      // Update payment status
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.COMPLETED,
          paystackRef: reference,
          paidAt: new Date(),
        },
      })

      // Update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
        },
      })

      // Ensure delivery record exists (create if not already created)
      const existingDelivery = await prisma.delivery.findUnique({
        where: { orderId: order.id },
      })

      if (!existingDelivery) {
        // Calculate estimated delivery time based on distance
        const orderWithLocation = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            shop: {
              select: { latitude: true, longitude: true },
            },
          },
        })

        let estimatedTime: Date | null = null
        if (
          orderWithLocation?.deliveryLatitude &&
          orderWithLocation?.deliveryLongitude &&
          orderWithLocation?.shop?.latitude &&
          orderWithLocation?.shop?.longitude
        ) {
          // Calculate distance in km
          const distance = calculateDistance(
            orderWithLocation.deliveryLatitude,
            orderWithLocation.deliveryLongitude,
            orderWithLocation.shop.latitude,
            orderWithLocation.shop.longitude
          )

          // Estimate delivery time: base 30 minutes + 10 minutes per km
          // Average delivery time in urban areas: 30-60 minutes base + travel time
          const baseMinutes = 30
          const minutesPerKm = 10
          const estimatedMinutes = baseMinutes + Math.round(distance * minutesPerKm)
          estimatedTime = new Date(Date.now() + estimatedMinutes * 60 * 1000)
        }

        // Create delivery record
        const newDelivery = await prisma.delivery.create({
          data: {
            orderId: order.id,
            status: DeliveryStatus.PENDING,
            estimatedTime,
          },
        })

        console.log(`[Payment Verify] Delivery created for order ${order.orderNumber}`)
        
        // Attempt automatic rider assignment
        try {
          const { autoAssignRider } = await import('@/lib/delivery-assignment')
          const assigned = await autoAssignRider(newDelivery.id)
          if (assigned) {
            console.log(`[Payment Verify] Rider automatically assigned to delivery for order ${order.orderNumber}`)
          }
        } catch (assignError) {
          console.error(`[Payment Verify] Failed to auto-assign rider:`, assignError)
          // Don't fail the payment verification if auto-assignment fails
        }
      } else {
        // Ensure delivery is in PENDING status (in case it was created earlier)
        if (existingDelivery.status !== DeliveryStatus.PENDING) {
          await prisma.delivery.update({
            where: { id: existingDelivery.id },
            data: { status: DeliveryStatus.PENDING },
          })
        }
        
        // Attempt automatic rider assignment if not already assigned
        if (!existingDelivery.riderId) {
          try {
            const { autoAssignRider } = await import('@/lib/delivery-assignment')
            await autoAssignRider(existingDelivery.id)
          } catch (assignError) {
            console.error(`[Payment Verify] Failed to auto-assign rider:`, assignError)
            // Don't fail the payment verification if auto-assignment fails
          }
        }
      }

      // Send payment confirmation email and notification
      const { notifyPaymentReceived, createNotification } = await import('@/lib/notifications')
      const { sendEmail, getPaymentConfirmationEmail, getOrderConfirmationEmail } = await import('@/lib/email')
      
      // Get order details for notifications and emails
      const orderWithDetails = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          shop: {
            select: { userId: true, name: true },
          },
          buyer: {
            select: { email: true, name: true, id: true },
          },
          items: {
            include: {
              product: { select: { name: true } },
              pricingUnit: { select: { unit: true } },
            },
          },
        },
      })

      // Notify seller that payment was received
      if (orderWithDetails?.shop?.userId) {
        await notifyPaymentReceived(
          orderWithDetails.shop.userId,
          order.orderNumber,
          paidAmount
        )
      }

      // Notify buyer that order was placed successfully (only after payment is confirmed)
      if (orderWithDetails?.buyer) {
        await createNotification(
          order.buyerId,
          NotificationType.ORDER_PLACED,
          'Order Placed Successfully',
          `Your order #${order.orderNumber} has been placed successfully. Payment confirmed!`,
          `/orders/${order.id}`
        )

        // Send order confirmation email with payment confirmation
        if (orderWithDetails.buyer.email) {
          await sendEmail({
            to: orderWithDetails.buyer.email,
            ...getOrderConfirmationEmail(
              order.orderNumber,
              orderWithDetails.items.map(item => ({
                name: item.product.name,
                quantity: item.quantity,
                unit: item.pricingUnit.unit,
                total: item.total,
              })),
              order.total,
              order.deliveryAddress || ''
            ),
          })
        }
      }
    } catch (error: any) {
      console.error('Paystack verification error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to verify payment' },
        { status: 500 }
      )
    }

    // Fetch updated order with full details for success page
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
          },
        },
        payment: {
          select: {
            id: true,
            status: true,
            amount: true,
            paidAt: true,
            paystackRef: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Payment verified successfully',
      order: {
        ...updatedOrder,
        status: OrderStatus.PAID, // Ensure status is PAID after verification
      },
    })
  } catch (error) {
    console.error('Payment verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    )
  }
}
