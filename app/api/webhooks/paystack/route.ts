/**
 * Paystack Webhook Handler
 * Handles payment callbacks from Paystack
 * This is more reliable than client-side verification
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, OrderStatus, DeliveryStatus, EscrowStatus, NotificationType } from '@prisma/client'
import { calculateDistance } from '@/lib/distance'
import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''

/**
 * Verify Paystack webhook signature
 */
function verifyPaystackSignature(
  payload: string,
  signature: string
): boolean {
  const hash = crypto
    .createHmac('sha512', PAYSTACK_SECRET_KEY)
    .update(payload)
    .digest('hex')
  return hash === signature
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      )
    }

    // Verify webhook signature
    if (!verifyPaystackSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const event = JSON.parse(body)

    // Handle different event types
    if (event.event === 'charge.success') {
      const { reference, amount, customer } = event.data

      // Find order by reference (orderNumber)
      const order = await prisma.order.findUnique({
        where: { orderNumber: reference },
        include: { payment: true },
      })

      if (!order) {
        console.error(`Order not found for reference: ${reference}`)
        return NextResponse.json({ received: true })
      }

      // Check if already processed
      if (order.payment?.status === PaymentStatus.COMPLETED) {
        return NextResponse.json({ received: true })
      }

      // Verify amount matches
      const paidAmount = amount / 100 // Convert from kobo to Naira
      if (Math.abs(paidAmount - order.total) > 0.01) {
        console.warn(
          `Amount mismatch for order ${order.id}: Expected ${order.total}, Got ${paidAmount}`
        )
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

      // Get shop and buyer for notifications
      const orderWithShop = await prisma.order.findUnique({
        where: { id: order.id },
        include: {
          shop: {
            select: {
              userId: true,
            },
          },
          buyer: {
            select: {
              email: true,
            },
          },
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
        // Get order with location data for distance calculation
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

        console.log(`[Webhook] Delivery created for order ${order.orderNumber}`)
        
        // Attempt automatic rider assignment
        try {
          const { autoAssignRider } = await import('@/lib/delivery-assignment')
          const assigned = await autoAssignRider(newDelivery.id)
          if (assigned) {
            console.log(`[Webhook] Rider automatically assigned to delivery for order ${order.orderNumber}`)
          }
        } catch (assignError) {
          console.error(`[Webhook] Failed to auto-assign rider:`, assignError)
          // Don't fail the webhook if auto-assignment fails
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
            console.error(`[Webhook] Failed to auto-assign rider:`, assignError)
            // Don't fail the webhook if auto-assignment fails
          }
        }
      }

      // Create notifications and send emails
      if (orderWithShop) {
        const { notifyPaymentReceived, createNotification } = await import('@/lib/notifications')
        const { sendEmail, getPaymentConfirmationEmail, getOrderConfirmationEmail } = await import('@/lib/email')
        
        // Get full order details for buyer notification
        const orderWithDetails = await prisma.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                product: { select: { name: true } },
                pricingUnit: { select: { unit: true } },
              },
            },
            buyer: {
              select: { email: true, name: true, id: true },
            },
            shop: {
              select: { name: true },
            },
          },
        })
        
        // Notify seller that payment was received
        await notifyPaymentReceived(
          orderWithShop.shop.userId,
          order.orderNumber,
          paidAmount
        )

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
      }

      console.log(`Payment successful for order ${order.orderNumber}`)
    } else if (event.event === 'refund.processed' || event.event === 'refund.failed') {
      // Handle refund webhook events
      const { id, transaction, status, refunded_at } = event.data

      // Find payment by refund reference
      const payment = await prisma.payment.findFirst({
        where: {
          refundRef: id?.toString(),
        },
        include: {
          order: {
            include: {
              buyer: {
                select: {
                  email: true,
                  name: true,
                },
              },
              items: {
                include: {
                  pricingUnit: {
                    select: { id: true, stock: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!payment) {
        console.warn(`Payment not found for refund ID: ${id}`)
        return NextResponse.json({ received: true })
      }

      // Update refund status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundStatus: status,
          refundedAt: refunded_at ? new Date(refunded_at) : null,
          status: status === 'processed' ? PaymentStatus.REFUNDED : payment.status,
          escrowStatus: status === 'processed' ? EscrowStatus.REFUNDED : payment.escrowStatus,
        },
      })

      // If refund is processed, update order and restore stock
      if (status === 'processed') {
        await prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        })

        // Restore stock for all items
        for (const item of payment.order.items) {
          if (item.pricingUnit.stock !== null) {
            await prisma.pricingUnit.update({
              where: { id: item.pricingUnitId },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            })
          }
        }

        // Send refund completion email to buyer
        if (payment.order.buyer?.email) {
          const { sendEmail } = await import('@/lib/email')
          const refundAmount = payment.amount

          await sendEmail({
            to: payment.order.buyer.email,
            subject: `Refund Completed - Order #${payment.order.orderNumber}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0;">Refund Completed</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                  <p>Hello${payment.order.buyer.name ? ` ${payment.order.buyer.name}` : ''},</p>
                  <p>Great news! Your refund for order #${payment.order.orderNumber} has been successfully processed.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #059669;">Refund Details</h2>
                    <p><strong>Order Number:</strong> #${payment.order.orderNumber}</p>
                    <p><strong>Refund Amount:</strong> ₦${refundAmount.toLocaleString()}</p>
                    <p><strong>Status:</strong> Processed</p>
                    <p><strong>Refunded At:</strong> ${new Date(refunded_at).toLocaleDateString()}</p>
                  </div>

                  <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0;"><strong>Next Steps:</strong> The refunded amount should appear in your account within 1-3 business days, depending on your bank or payment method.</p>
                  </div>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${payment.orderId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                    If you have any questions, please contact our support team.
                  </p>
                </div>
              </body>
              </html>
            `,
          })
        }

        console.log(`[Webhook] Refund processed for order ${payment.order.orderNumber}`)
      } else if (status === 'failed') {
        // Refund failed - send notification email
        if (payment.order.buyer?.email) {
          const { sendEmail } = await import('@/lib/email')
          await sendEmail({
            to: payment.order.buyer.email,
            subject: `Refund Failed - Order #${payment.order.orderNumber}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="color: white; margin: 0;">Refund Failed</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                  <p>Hello${payment.order.buyer.name ? ` ${payment.order.buyer.name}` : ''},</p>
                  <p>We encountered an issue processing your refund for order #${payment.order.orderNumber}.</p>
                  
                  <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                    <p style="margin: 0;"><strong>What happened?</strong> The refund could not be processed automatically. Our team has been notified and will investigate the issue.</p>
                  </div>

                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0; color: #dc2626;">Next Steps</h2>
                    <p>Please contact our support team for assistance. We will work to resolve this issue as quickly as possible.</p>
                    <p><strong>Order Number:</strong> #${payment.order.orderNumber}</p>
                    <p><strong>Refund ID:</strong> ${id}</p>
                  </div>

                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                    We apologize for any inconvenience. Our support team will assist you with resolving this issue.
                  </p>
                </div>
              </body>
              </html>
            `,
          })
        }

        console.error(`[Webhook] Refund failed for order ${payment.order.orderNumber}`, { refundId: id, status })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// Paystack sends GET request to verify webhook URL
export async function GET() {
  return NextResponse.json({ message: 'Paystack webhook endpoint' })
}
