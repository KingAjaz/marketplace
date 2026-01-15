/**
 * Payment API
 * Initialize Paystack payment for order
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { initializePaystackPayment } from '@/lib/paystack'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting for payment initialization
    const { checkRateLimit, rateLimiters } = await import('@/lib/rate-limit')
    const rateLimitResult = await checkRateLimit(request, rateLimiters.payment, session.user.id)
    if (!rateLimitResult.success) {
      return rateLimitResult.response as NextResponse
    }

    const { id } = await params

    console.log('Payment initialization request:', { orderId: id, userId: session.user.id })

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        buyer: true,
      },
    })

    if (!order) {
      console.error('Order not found for payment initialization:', { orderId: id })
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    console.log('Order found for payment:', { orderId: order.id, buyerId: order.buyerId, sessionUserId: session.user.id, orderStatus: order.status, paymentStatus: order.payment?.status })

    if (String(order.buyerId) !== String(session.user.id)) {
      console.error('Unauthorized payment attempt:', { orderBuyerId: order.buyerId, sessionUserId: session.user.id })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (order.payment?.status === 'COMPLETED') {
      console.log('Order already paid, skipping payment initialization')
      return NextResponse.json(
        { error: 'Order already paid' },
        { status: 400 }
      )
    }

    // Ensure order status is still PENDING before payment
    if (order.status !== 'PENDING') {
      console.warn('Order status is not PENDING:', { orderId: order.id, status: order.status })
      // Don't block payment, but log warning
    }

    // Initialize Paystack payment
    try {
      console.log('Initializing Paystack payment:', { 
        orderId: order.id, 
        orderNumber: order.orderNumber,
        email: order.buyer.email,
        amount: order.total,
        amountInKobo: Math.round(order.total * 100)
      })

      // Set callback URL to redirect back to order page after payment
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const callbackUrl = `${baseUrl}/orders/${order.id}/payment/success`

      const paystackResponse = await initializePaystackPayment({
        email: order.buyer.email,
        amount: Math.round(order.total * 100), // Convert Naira to kobo
        reference: order.orderNumber,
        callback_url: callbackUrl,
        metadata: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          buyerId: order.buyerId,
        },
      })

      console.log('Paystack response:', { 
        status: paystackResponse.status, 
        message: paystackResponse.message,
        hasAuthUrl: !!paystackResponse.data?.authorization_url,
        authUrl: paystackResponse.data?.authorization_url
      })

      if (!paystackResponse.status || !paystackResponse.data?.authorization_url) {
        console.error('Paystack initialization failed:', paystackResponse)
        return NextResponse.json(
          { error: paystackResponse.message || 'Failed to initialize payment' },
          { status: 400 }
        )
      }

      // Update payment record with Paystack reference
      if (order.payment) {
        await prisma.payment.update({
          where: { orderId: order.id },
          data: {
            paystackRef: paystackResponse.data.reference,
          },
        })
      }

      return NextResponse.json({
        paymentUrl: paystackResponse.data.authorization_url,
        reference: paystackResponse.data.reference,
        accessCode: paystackResponse.data.access_code,
        message: 'Payment initialized successfully',
      })
    } catch (error: any) {
      console.error('Paystack initialization error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to initialize payment' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Payment initialization error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize payment' },
      { status: 500 }
    )
  }
}
