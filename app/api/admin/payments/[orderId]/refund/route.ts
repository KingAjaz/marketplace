/**
 * Admin Payment Refund API
 * 
 * Refunds a payment to the buyer via Paystack
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PaymentStatus, EscrowStatus, OrderStatus } from '@prisma/client'
import { refundPaystackTransaction } from '@/lib/paystack'
import { sendEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for refund operations (sensitive)
    const { checkRateLimit, rateLimiters } = await import('@/lib/rate-limit')
    const rateLimitResult = await checkRateLimit(request, rateLimiters.sensitive, session.user.id)
    if (!rateLimitResult.success) {
      return rateLimitResult.response as NextResponse
    }

    // Check if user has admin role
    const adminRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'ADMIN',
        isActive: true,
      },
    })

    if (!adminRole) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { orderId } = await params
    const { reason, amount } = await request.json() // amount is optional for partial refund

    // Get order with payment and buyer
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        buyer: {
          select: {
            email: true,
            name: true,
          },
        },
        items: {
          include: {
            pricingUnit: true,
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

    if (!order.payment) {
      return NextResponse.json(
        { error: 'Payment not found for this order' },
        { status: 404 }
      )
    }

    // Verify payment can be refunded
    if (order.payment.status === PaymentStatus.REFUNDED) {
      return NextResponse.json(
        { error: 'Payment already refunded' },
        { status: 400 }
      )
    }

    if (order.payment.status === PaymentStatus.RELEASED) {
      return NextResponse.json(
        { error: 'Payment already released to seller. Cannot refund.' },
        { status: 400 }
      )
    }

    if (order.payment.status !== PaymentStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Payment must be completed before it can be refunded' },
        { status: 400 }
      )
    }

    if (!order.payment.paystackRef) {
      return NextResponse.json(
        { error: 'Payment reference not found. Cannot process refund.' },
        { status: 400 }
      )
    }

    // Process refund with Paystack
    let refundResult
    try {
      // Convert amount to kobo if partial refund specified
      const refundAmount = amount ? Math.round(amount * 100) : undefined
      const refundReason = reason || `Refund for order #${order.orderNumber}`

      refundResult = await refundPaystackTransaction(
        order.payment.paystackRef,
        refundAmount,
        refundReason
      )

      if (!refundResult.status || !refundResult.data) {
        throw new Error(refundResult.message || 'Failed to process refund with Paystack')
      }

      // Update payment status
      // Status will be updated to REFUNDED when webhook confirms the refund is processed
      // For now, mark as processing if status is pending/processing
      const refundStatus = refundResult.data.status
      const isRefundProcessed = refundStatus === 'processed'
      const isRefundFailed = refundStatus === 'failed'

      await prisma.payment.update({
        where: { id: order.payment.id },
        data: {
          refundRef: refundResult.data.id.toString(),
          refundStatus: refundStatus,
          status: isRefundProcessed ? PaymentStatus.REFUNDED : order.payment.status,
          escrowStatus: isRefundProcessed ? EscrowStatus.REFUNDED : order.payment.escrowStatus,
          refundedAt: isRefundProcessed ? new Date(refundResult.data.refunded_at || new Date()) : null,
        },
      })

      // Update order status if refund is processed immediately
      if (isRefundProcessed) {
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        })

        // Restore stock for all items
        for (const item of order.items) {
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
      } else if (isRefundFailed) {
        // Refund failed - log error but don't update order status
        console.error(`[Refund] Refund failed for order ${order.orderNumber}:`, {
          refundId: refundResult.data.id,
          status: refundStatus,
          error: 'Refund processing failed at Paystack',
        })
        throw new Error('Refund processing failed. Please check Paystack dashboard for details.')
      }

      // Send refund confirmation email to buyer
      if (order.buyer?.email) {
        const refundAmountNaira = refundResult.data.amount / 100
        await sendEmail({
          to: order.buyer.email,
          subject: `Refund Processed - Order #${order.orderNumber}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: white; margin: 0;">Refund Processed</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
                <p>Hello${order.buyer.name ? ` ${order.buyer.name}` : ''},</p>
                <p>Your refund for order #${order.orderNumber} has been ${isRefundProcessed ? 'processed' : 'initiated'}.</p>
                
                <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin-top: 0; color: #059669;">Refund Details</h2>
                  <p><strong>Order Number:</strong> #${order.orderNumber}</p>
                  <p><strong>Refund Amount:</strong> ₦${refundAmountNaira.toLocaleString()}</p>
                  <p><strong>Status:</strong> ${refundStatus.charAt(0).toUpperCase() + refundStatus.slice(1).replace('_', ' ')}</p>
                  ${refundResult.data.expected_at ? `<p><strong>Expected Completion:</strong> ${new Date(refundResult.data.expected_at).toLocaleDateString()}</p>` : ''}
                  ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                </div>

                ${isRefundProcessed ? (
                  `<div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                    <p style="margin: 0;"><strong>Refund Completed:</strong> The refund has been processed and should appear in your account within 1-3 business days.</p>
                  </div>`
                ) : (
                  `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0;"><strong>Processing:</strong> Your refund is being processed and will be completed soon. You'll receive another email when it's complete.</p>
                  </div>`
                )}

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${orderId}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
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

      console.log(`[Admin] Refund initiated for order ${order.orderNumber}:`, {
        orderId: order.id,
        refundId: refundResult.data.id,
        refundAmount: refundResult.data.amount / 100,
        refundStatus: refundStatus,
        reason: reason || 'No reason provided',
        refundedBy: session.user.id,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json({
        message: isRefundProcessed
          ? 'Refund processed successfully'
          : 'Refund initiated successfully. It will be processed shortly.',
        orderId: order.id,
        orderNumber: order.orderNumber,
        refundId: refundResult.data.id,
        refundAmount: refundResult.data.amount / 100,
        refundStatus: refundStatus,
        expectedAt: refundResult.data.expected_at,
      })
    } catch (paystackError: any) {
      console.error('[Refund] Paystack refund error:', paystackError)
      return NextResponse.json(
        {
          error: paystackError.message || 'Failed to process refund with Paystack',
          details: 'Please check Paystack dashboard for more details.',
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Refund payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to refund payment' },
      { status: 500 }
    )
  }
}
