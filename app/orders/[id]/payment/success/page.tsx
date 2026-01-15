'use client'

/**
 * Payment Success Page
 * 
 * Handles Paystack redirect after payment
 * Verifies payment and clears cart
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { CheckCircle, Loader2, XCircle, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useCart } from '@/hooks/use-cart'
import { useToast } from '@/hooks/use-toast'

export default function PaymentSuccessPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const orderId = params.id as string
  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const { clearCart } = useCart()
  const { toast } = useToast()
  
  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState<any>(null)

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }

    if (orderId && reference) {
      verifyPayment()
    } else if (!reference) {
      setError('Payment reference not found. Please check your order status.')
      setVerifying(false)
    }
  }, [orderId, reference, session, router])

  const verifyPayment = async () => {
    try {
      console.log('Verifying payment:', { orderId, reference })
      
      const response = await fetch(`/api/orders/${orderId}/payment/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed')
      }

      console.log('Payment verified successfully:', data)
      setVerified(true)
      setOrder(data.order)

      // Clear cart ONLY after successful payment verification
      // This ensures cart is not cleared until payment is confirmed
      if (data.order && data.order.status === 'PAID') {
        clearCart()
        console.log('Cart cleared after successful payment verification')
        
        // Show success notification with order number (only after payment is confirmed)
        const orderNumber = data.order.orderNumber || 'Unknown'
        toast({
          title: 'Order Placed Successfully!',
          description: `Your order #${orderNumber} has been placed successfully. Payment confirmed!`,
          variant: 'default',
        })
      }
    } catch (err: any) {
      console.error('Payment verification error:', err)
      setError(err.message || 'Failed to verify payment. Please check your order status.')
      toast({
        title: 'Verification Error',
        description: err.message || 'Failed to verify payment. Your order may still be processing.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Verifying Payment...</h2>
            <p className="text-gray-600">Please wait while we confirm your payment</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Verification Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Link href={`/orders/${orderId}`}>
                <Button variant="outline" className="w-full">
                  Check Order Status
                </Button>
              </Link>
              <Link href="/orders">
                <Button variant="ghost" className="w-full">
                  View All Orders
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <CardTitle>Payment Successful!</CardTitle>
                <CardDescription>Your order has been confirmed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                Your payment has been successfully processed. Your order is now being prepared for delivery.
              </p>
            </div>

            {order && (
              <div>
                <h3 className="font-semibold mb-3">Order Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Order Number:</span>
                    <span className="font-medium">{order.orderNumber}</span>
                  </div>
                  {order.shop && (
                    <div className="flex justify-between">
                      <span>Shop:</span>
                      <span className="font-medium">{order.shop.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Total Paid:</span>
                    <span className="font-bold">{formatCurrency(order.total)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t space-y-3">
              <Link href={`/orders/${orderId}`} className="block">
                <Button className="w-full">
                  View Order Details
                </Button>
              </Link>
              <Link href="/orders" className="block">
                <Button variant="outline" className="w-full">
                  View All Orders
                </Button>
              </Link>
              <Link href="/market" className="block">
                <Button variant="ghost" className="w-full">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
