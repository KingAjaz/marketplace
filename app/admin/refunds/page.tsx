'use client'

/**
 * Admin Refund Management Page
 * 
 * View orders eligible for refund and process refunds
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface RefundableOrder {
  id: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
  buyer: {
    name: string | null
    email: string
  }
  shop: {
    name: string
  }
  payment: {
    id: string
    status: string
    escrowStatus: string
  } | null
}

export default function AdminRefundsPage() {
  const [orders, setOrders] = useState<RefundableOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState<string | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    fetchRefundableOrders()
  }, [])

  const fetchRefundableOrders = async () => {
    try {
      // Get orders that are paid but can be refunded
      const response = await fetch('/api/orders')
      if (response.ok) {
        const data = await response.json()
        // Filter for orders that can be refunded (paid but not delivered or cancelled)
        const refundable = (data.orders || []).filter((order: any) => {
          return (
            order.payment?.status === 'COMPLETED' &&
            order.payment?.escrowStatus !== 'REFUNDED' &&
            order.status !== 'DELIVERED' &&
            order.status !== 'CANCELLED'
          )
        })
        setOrders(refundable)
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async (orderId: string) => {
    if (!confirm(`Are you sure you want to refund order #${orderId}?`)) {
      return
    }

    setRefunding(orderId)
    try {
      const response = await fetch(`/api/admin/payments/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason }),
      })

      if (response.ok) {
        toast({
          title: 'Refund Processed',
          description: 'Refund processed successfully',
          variant: 'success',
        })
        setRefundReason('')
        fetchRefundableOrders()
      } else {
        const data = await response.json()
        toast({
          title: 'Refund Failed',
          description: data.error || 'Failed to process refund',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to process refund:', error)
      toast({
        title: 'Refund Failed',
        description: 'Failed to process refund',
        variant: 'destructive',
      })
    } finally {
      setRefunding(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading refundable orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Refund Management</h1>
          <p className="text-gray-600">Process refunds for orders</p>
        </div>

        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Refundable Orders
              </CardTitle>
              <CardDescription>
                Orders that are paid but can be refunded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="refundReason">Default Refund Reason (Optional)</Label>
                <Input
                  id="refundReason"
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Enter default reason for refunds..."
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">No refundable orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Order #{order.orderNumber}</CardTitle>
                      <CardDescription className="mt-1">
                        Buyer: {order.buyer.name || order.buyer.email} • Shop: {order.shop.name}
                      </CardDescription>
                      <CardDescription className="mt-1">
                        Created: {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Amount</p>
                      <p className="text-2xl font-bold">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Status: <span className="font-medium">{order.status}</span></p>
                      <p className="text-sm text-gray-600">
                        Payment: <span className="font-medium">{order.payment?.status}</span>
                      </p>
                      <p className="text-sm text-gray-600">
                        Escrow: <span className="font-medium">{order.payment?.escrowStatus}</span>
                      </p>
                    </div>
                    <Button
                      onClick={() => handleRefund(order.id)}
                      disabled={refunding === order.id}
                      variant="destructive"
                    >
                      {refunding === order.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Process Refund'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
