'use client'

/**
 * Payment Page
 * 
 * Initializes Paystack payment and redirects user to Paystack checkout
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Loader2, CreditCard, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface Order {
  id: string
  orderNumber: string
  total: number
  status: string
  shop: {
    name: string
  }
  items: {
    id: string
    quantity: number
    unitPrice: number
    total: number
    product: {
      name: string
    }
    pricingUnit: {
      unit: string
    }
  }[]
  payment: {
    id: string
    status: string
    escrowStatus: string
  } | null
}

export default function PaymentPage() {
  const params = useParams()
  const router = useRouter()
  const { user, status: sessionStatus } = useAuth()
  const orderId = params.id as string
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState('')

  console.log('PaymentPage mounted:', { orderId, sessionStatus, hasUser: !!user })

  useEffect(() => {
    console.log('PaymentPage useEffect triggered:', { orderId, sessionStatus, hasUser: !!user })
    
    if (sessionStatus === 'loading') {
      console.log('User data is loading, waiting...')
      return
    }

    if (sessionStatus === 'unauthenticated' || !user) {
      console.log('No user, redirecting to signin')
      router.push('/auth/signin')
      return
    }

    if (!orderId) {
      console.error('No orderId in params:', params)
      setError('Invalid order ID')
      setLoading(false)
      return
    }

    console.log('Fetching order for payment:', orderId)
    fetchOrder()
  }, [orderId, sessionStatus, user, router, params])

  const fetchOrder = async () => {
    console.log('=== fetchOrder called ===', { orderId, hasOrderId: !!orderId })
    
    try {
      if (!orderId) {
        console.error('No orderId provided to fetchOrder')
        setError('Invalid order ID')
        setLoading(false)
        return
      }

      console.log('Making API call to fetch order:', `/api/orders/${orderId}`)
      const response = await fetch(`/api/orders/${orderId}`)
      console.log('Order fetch response received:', { status: response.status, ok: response.ok })
      
      const data = await response.json()
      console.log('Order fetch data parsed:', { hasOrder: !!data.order })

      if (!response.ok) {
        console.error('Failed to fetch order:', { status: response.status, data })
        setError(data.error || 'Order not found')
        setLoading(false)
        return
      }

      if (!data.order) {
        console.error('Order response missing order:', data)
        setError('Order data is missing')
        setLoading(false)
        return
      }

      console.log('Order loaded successfully:', { orderId, status: data.order.status, paymentStatus: data.order.payment?.status })
      setOrder(data.order)
      setLoading(false)
      
      // Automatically initialize payment and redirect to Paystack if order is pending payment
      const orderStatus = data.order.status
      const paymentStatus = data.order.payment?.status
      
      // Automatically initialize payment if order is PENDING (regardless of payment status, except if already completed)
      // This ensures that as soon as an order is created, payment is initialized
      const shouldAutoInitialize = 
        orderStatus === 'PENDING' && 
        paymentStatus !== 'COMPLETED'
      
      console.log('Payment auto-initialization check:', { 
        orderStatus, 
        paymentStatus, 
        shouldAutoInitialize,
        orderId,
        order: data.order
      })
      
      if (shouldAutoInitialize && orderId) {
        // Auto-initialize payment immediately - redirect to Paystack
        console.log('✓ Auto-initializing payment for order:', orderId)
        // Small delay to ensure state is updated
        setTimeout(() => {
          console.log('Calling handlePaymentDirect with orderId:', orderId)
          handlePaymentDirect(orderId)
        }, 200)
      } else {
        console.log('✗ Skipping auto-initialization:', { orderStatus, paymentStatus, shouldAutoInitialize, orderId })
      }
    } catch (err: any) {
      console.error('Fetch order error:', err)
      setError(err.message || 'Failed to load order. Please try again.')
      setLoading(false)
    }
  }

  const handlePaymentDirect = async (id: string) => {
    if (!id) {
      setError('Order ID is missing')
      setLoading(false)
      return
    }

    setProcessing(true)
    setError('')

    try {
      console.log('Initializing payment for order:', id)
      const response = await fetch(`/api/orders/${id}/payment`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Payment initialization failed:', { status: response.status, data })
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack payment page
      if (data.paymentUrl) {
        console.log('Redirecting to Paystack:', data.paymentUrl)
        // Use window.location.replace to prevent back button issues
        window.location.replace(data.paymentUrl)
      } else {
        console.error('No payment URL received from Paystack:', { data, response })
        throw new Error('Payment URL not received from Paystack. Please check Paystack configuration.')
      }
    } catch (err: any) {
      console.error('Payment initialization error:', err)
      setError(err.message || 'Failed to initialize payment. Please try again.')
      setProcessing(false)
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!orderId) {
      setError('Order ID is missing')
      setLoading(false)
      return
    }

    // Check if already paid (only if order is loaded)
    if (order) {
      const isPaid = order.status === 'PAID' || order.status === 'PREPARING' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'
      const paymentCompleted = order.payment?.status === 'COMPLETED'
      
      if (isPaid || paymentCompleted) {
        setError('This order has already been paid')
        setLoading(false)
        return
      }
    }

    await handlePaymentDirect(orderId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link href="/market">
              <Button>Back to Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!order) {
    return null
  }

  // Only show "order complete" if payment status is COMPLETED
  // Order status alone is not enough - payment must be confirmed
  const paymentCompleted = order.payment?.status === 'COMPLETED'
  const orderStatusPaid = order.status === 'PAID' || order.status === 'PREPARING' || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED'

  // If payment is completed, show success message
  if (paymentCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your payment has been confirmed and your order is being processed.</p>
            <div className="space-y-2">
              <Link href={`/orders/${orderId}`} className="block">
                <Button className="w-full">View Order Details</Button>
              </Link>
              <Link href="/orders" className="block">
                <Button variant="outline" className="w-full">View All Orders</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // For pending orders, show payment interface
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Link href="/checkout">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Checkout
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Complete Payment</CardTitle>
                <CardDescription>Order #{order.orderNumber}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

              {/* Order is PENDING - show payment interface */}
              <div>
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Shop:</span>
                    <span className="font-medium">{order.shop.name}</span>
                  </div>
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-gray-600">
                      <span>
                        {item.product.name} - {item.quantity} {item.pricingUnit.unit}
                      </span>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  You will be redirected to Paystack to complete your payment securely.
                  Your payment is protected by escrow and will only be released after delivery confirmation.
                </p>
              </div>

              <Button
                onClick={handlePayment}
                className="w-full"
                size="lg"
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay with Paystack
                  </>
                )}
              </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
