/**
 * Cancel Order API
 * 
 * Cancels an order and restores stock if applicable
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OrderStatus, PaymentStatus, EscrowStatus } from '@prisma/client'
import { restoreStockFromOrder } from '@/lib/inventory'
import { refundPaystackTransaction } from '@/lib/paystack'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { reason, cancellationReason } = await request.json() // Optional cancellation reason

    // Get order
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        shop: {
          select: {
            userId: true,
          },
        },
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
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check authorization - buyer or seller can cancel
    const isBuyer = order.buyerId === session.user.id
    const isSeller = order.shop.userId === session.user.id

    if (!isBuyer && !isSeller) {
      return NextResponse.json(
        { error: 'Unauthorized to cancel this order' },
        { status: 403 }
      )
    }

    // Validate cancellation reason for sellers
    const finalReason = reason || cancellationReason
    if (isSeller && !finalReason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required for seller cancellations' },
        { status: 400 }
      )
    }

    // Check if order can be cancelled
    if (order.status === OrderStatus.CANCELLED) {
      return NextResponse.json(
        { error: 'Order is already cancelled' },
        { status: 400 }
      )
    }

    if (order.status === OrderStatus.DELIVERED) {
      return NextResponse.json(
        { error: 'Cannot cancel a delivered order' },
        { status: 400 }
      )
    }

    if (order.status === OrderStatus.DISPUTED) {
      return NextResponse.json(
        { error: 'Cannot cancel an order that is in dispute. Please resolve the dispute first.' },
        { status: 400 }
      )
    }

    // Sellers can only cancel orders that haven't been marked as OUT_FOR_DELIVERY
    if (isSeller && order.status === OrderStatus.OUT_FOR_DELIVERY) {
      return NextResponse.json(
        { error: 'Cannot cancel an order that is already out for delivery. Please contact support.' },
        { status: 400 }
      )
    }

    // If payment is completed, automatically refund
    let refundInitiated = false
    let refundStatus: string | null = null
    let refundId: string | null = null

    if (order.payment?.status === PaymentStatus.COMPLETED && order.payment.paystackRef) {
      try {
        const refundReason = finalReason || `Auto-refund for order cancellation #${order.orderNumber} by ${isBuyer ? 'buyer' : 'seller'}`

        // Process automatic refund via Paystack
        const refundResult = await refundPaystackTransaction(
          order.payment.paystackRef,
          undefined, // Full refund
          refundReason
        )

        if (refundResult.status && refundResult.data) {
          refundInitiated = true
          refundStatus = refundResult.data.status
          refundId = refundResult.data.id.toString()

          // Update payment with refund info
          const isRefundProcessed = refundStatus === 'processed'
          const isRefundFailed = refundStatus === 'failed'

          await prisma.payment.update({
            where: { id: order.payment.id },
            data: {
              refundRef: refundId,
              refundStatus: refundStatus,
              status: isRefundProcessed ? PaymentStatus.REFUNDED : order.payment.status,
              escrowStatus: isRefundProcessed ? EscrowStatus.REFUNDED : order.payment.escrowStatus,
              refundedAt: isRefundProcessed ? new Date(refundResult.data.refunded_at || new Date()) : null,
            },
          })

          if (isRefundFailed) {
            console.error(`[Cancel Order] Auto-refund failed for order ${order.orderNumber}:`, {
              refundId,
              status: refundStatus,
            })
            // Continue with cancellation even if refund failed - admin can manually process later
          }
        }
      } catch (refundError: any) {
        console.error(`[Cancel Order] Auto-refund error for order ${order.orderNumber}:`, refundError)
        // Log error but continue with cancellation - refund can be processed manually later
        // Don't block cancellation if refund fails
      }
    }

    // Update order status (only cancel immediately if refund is processed or no refund needed)
    const shouldCancelImmediately = !refundInitiated || refundStatus === 'processed'
    
    if (shouldCancelImmediately) {
      await prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      })

      // Restore stock
      try {
        await restoreStockFromOrder(id)
      } catch (error) {
        console.error('Failed to restore stock:', error)
        // Don't fail the cancellation if stock restoration fails
      }
    } else {
      // If refund is pending/processing, mark order as pending cancellation
      // Order will be fully cancelled when refund webhook confirms processing
      await prisma.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      })

      // Note: Stock will be restored when refund is confirmed via webhook
    }

    // Create notifications
    const { createNotification, NotificationType } = await import('@/lib/notifications')
    const cancellationMessage = isSeller
      ? `Order #${order.orderNumber} has been cancelled by the seller.${refundInitiated && refundStatus !== 'processed' ? ' Refund is being processed.' : ''}${finalReason ? ` Reason: ${finalReason}` : ''}`
      : `Your order #${order.orderNumber} has been cancelled.${refundInitiated && refundStatus !== 'processed' ? ' Refund is being processed.' : ''}`
    
    await Promise.all([
      createNotification(
        order.buyerId,
        NotificationType.ORDER_STATUS_UPDATE,
        isSeller ? 'Order Cancelled by Seller' : 'Order Cancelled',
        cancellationMessage,
        `/orders/${id}`
      ),
      // Only notify seller if buyer cancelled (seller already knows if they cancelled)
      ...(isBuyer ? [createNotification(
        order.shop.userId,
        NotificationType.ORDER_STATUS_UPDATE,
        'Order Cancelled by Buyer',
        `Order #${order.orderNumber} has been cancelled by the buyer.${refundInitiated ? ' Refund has been initiated.' : ''}`,
        `/seller/orders/${id}`
      )] : []),
    ])

    // Send cancellation email to buyer
    if (order.buyer?.email) {
      const { sendEmail } = await import('@/lib/email')
      await sendEmail({
        to: order.buyer.email,
        subject: `Order Cancelled - #${order.orderNumber}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Order Cancelled</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Hello${order.buyer.name ? ` ${order.buyer.name}` : ''},</p>
              <p>Your order #${order.orderNumber} has been cancelled.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="margin-top: 0; color: #4b5563;">Order Details</h2>
                <p><strong>Order Number:</strong> #${order.orderNumber}</p>
                ${finalReason ? `<p><strong>Cancellation Reason:</strong> ${finalReason}</p>` : ''}
                ${isSeller ? '<p style="color: #f59e0b; margin-top: 10px;"><strong>Note:</strong> This order was cancelled by the seller.</p>' : ''}
              </div>

              ${refundInitiated ? (
                `<div style="background: ${refundStatus === 'processed' ? '#d1fae5' : '#fef3c7'}; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${refundStatus === 'processed' ? '#10b981' : '#f59e0b'};">
                  <p style="margin: 0;"><strong>Refund Status:</strong> ${refundStatus === 'processed' ? 'Your refund has been processed and should appear in your account within 1-3 business days.' : 'Your refund is being processed. You will receive another email when it is complete.'}</p>
                </div>`
              ) : (
                `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0;">No payment was made for this order, so no refund is required.</p>
                </div>`
              )}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${id}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
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

    return NextResponse.json({
      message: refundInitiated
        ? `Order cancelled${refundStatus === 'processed' ? ' and refund processed' : '. Refund is being processed'}`
        : 'Order cancelled successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: OrderStatus.CANCELLED,
      },
      refund: refundInitiated
        ? {
            initiated: true,
            refundId,
            status: refundStatus,
          }
        : { initiated: false },
    })
  } catch (error: any) {
    console.error('Cancel order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel order' },
      { status: 500 }
    )
  }
}
