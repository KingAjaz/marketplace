'use client'

/**
 * Admin Escrow Management Page
 * 
 * View and release escrow payments to sellers
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, CheckCircle, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface PendingOrder {
  id: string
  orderNumber: string
  total: number
  platformFee: number
  sellerAmount: number
  shop: {
    id: string
    name: string
  }
  buyer: {
    name: string | null
    email: string
  }
  deliveredAt: string | null
  createdAt: string
}

interface PendingEscrowData {
  orders: PendingOrder[]
  total: number
  totalAmount: number
  totalPlatformFee: number
}

export default function AdminPaymentsPage() {
  const [data, setData] = useState<PendingEscrowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [releasing, setReleasing] = useState<string | null>(null)
  const [showReleaseDialog, setShowReleaseDialog] = useState(false)
  const [orderToRelease, setOrderToRelease] = useState<PendingOrder | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingPayments()
  }, [])

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch('/api/admin/payments/pending')
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch pending payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseEscrow = async (orderId: string) => {
    setReleasing(orderId)
    try {
      const response = await fetch(`/api/admin/payments/${orderId}/release`, {
        method: 'POST',
      })

      if (response.ok) {
        toast({
          title: 'Escrow Released',
          description: 'Escrow released successfully',
          variant: 'success',
        })
        // Refresh list
        fetchPendingPayments()
      } else {
        const result = await response.json()
        toast({
          title: 'Release Failed',
          description: result.error || 'Failed to release escrow',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to release escrow:', error)
      toast({
        title: 'Release Failed',
        description: 'Failed to release escrow',
        variant: 'destructive',
      })
    } finally {
      setReleasing(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending payments...</p>
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
          <h1 className="text-3xl font-bold mb-2">Escrow Management</h1>
          <p className="text-gray-600">Release payments to sellers after delivery confirmation</p>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Releases</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.total || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Orders awaiting release</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Seller Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data ? formatCurrency(data.totalAmount) : formatCurrency(0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">To be released to sellers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data ? formatCurrency(data.totalPlatformFee) : formatCurrency(0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Platform commission</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Orders */}
        {data && data.orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">All Clear!</h2>
              <p className="text-gray-600">No pending escrow releases</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Order #{order.orderNumber}</CardTitle>
                      <CardDescription className="mt-1">
                        Shop: {order.shop.name} • Buyer: {order.buyer.name || order.buyer.email}
                      </CardDescription>
                      {order.deliveredAt && (
                        <CardDescription className="mt-1">
                          Delivered on {new Date(order.deliveredAt).toLocaleDateString()}
                        </CardDescription>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Order</p>
                      <p className="text-xl font-bold">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 items-center">
                    <div>
                      <p className="text-sm text-gray-600">Platform Fee</p>
                      <p className="text-lg font-semibold">{formatCurrency(order.platformFee)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Seller Amount</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(order.sellerAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-sm font-medium text-yellow-600">Held in Escrow</p>
                    </div>
                    <div>
                      <Button
                        onClick={() => {
                          setOrderToRelease(order)
                          setShowReleaseDialog(true)
                        }}
                        disabled={releasing === order.id}
                        className="w-full"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Release Escrow
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Release Escrow Dialog */}
        <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Release Escrow Payment</DialogTitle>
              <DialogDescription>
                Are you sure you want to release escrow for order #{orderToRelease?.orderNumber}?
                The seller will receive {orderToRelease ? formatCurrency(orderToRelease.sellerAmount) : 'N/A'}.
              </DialogDescription>
            </DialogHeader>
            {orderToRelease && (
              <div className="py-4 space-y-2">
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Order Total:</span>
                    <span className="font-medium">{formatCurrency(orderToRelease.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Platform Fee:</span>
                    <span className="font-medium">{formatCurrency(orderToRelease.platformFee)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Seller Amount:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(orderToRelease.sellerAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowReleaseDialog(false)
                  setOrderToRelease(null)
                }}
                disabled={releasing === orderToRelease?.id}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (orderToRelease) {
                    handleReleaseEscrow(orderToRelease.id)
                    setShowReleaseDialog(false)
                  }
                }}
                disabled={releasing === orderToRelease?.id}
              >
                {releasing === orderToRelease?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Releasing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Release
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
