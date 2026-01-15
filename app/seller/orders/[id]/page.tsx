'use client'

/**
 * Seller Order Detail Page
 * 
 * Shows order details and allows seller to update order status
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  Truck, 
  ArrowLeft,
  Loader2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'
import { useOrderStream } from '@/hooks/use-order-stream'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  total: number
  product: {
    id: string
    name: string
    images: string[]
  }
  pricingUnit: {
    id: string
    unit: string
    price: number
  }
}

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  subtotal: number
  platformFee: number
  deliveryFee: number
  total: number
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryPhone: string
  notes: string | null
  createdAt: string
  deliveredAt: string | null
  buyer: {
    id: string
    name: string | null
    email: string
    phoneNumber: string | null
  }
  items: OrderItem[]
  payment: {
    id: string
    status: string
    escrowStatus: string
    releasedAt: string | null
  } | null
  delivery: {
    id: string
    status: string
    rider: {
      id: string
      name: string | null
      phoneNumber: string | null
    } | null
    pickedUpAt: string | null
    deliveredAt: string | null
  } | null
}

export default function SellerOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [cancelReasonType, setCancelReasonType] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const { toast } = useToast()

  // Real-time order updates
  const { isConnected, lastUpdate } = useOrderStream({
    orderId,
    enabled: !!order && !!session,
    onUpdate: (update) => {
      if (update.type === 'order_status_update' && update.order) {
        setOrder((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            status: update.order!.status as OrderStatus,
            deliveredAt: update.order!.deliveredAt || prev.deliveredAt,
          }
        })
      } else if (update.type === 'delivery_status_update') {
        setOrder((prev) => {
          if (!prev || !prev.delivery) return prev
          return {
            ...prev,
            delivery: {
              ...prev.delivery,
              status: update.status!,
              rider: update.rider || prev.delivery.rider,
              pickedUpAt: update.pickedUpAt || prev.delivery.pickedUpAt,
              deliveredAt: update.deliveredAt || prev.delivery.deliveredAt,
            },
          }
        })
      }
    },
  })

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrder()
  }, [orderId, session, router])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.userRole !== 'seller' && data.userRole !== 'admin') {
          router.push('/unauthorized')
          return
        }
        setOrder(data.order)
      } else {
        console.error('Failed to fetch order')
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/seller/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchOrder()
        toast({
          title: 'Order Updated',
          description: `Order status updated to ${newStatus.replace('_', ' ')}`,
          variant: 'success',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Update Failed',
          description: data.error || 'Failed to update order status',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to update order:', error)
      toast({
        title: 'Update Failed',
        description: 'Failed to update order status',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return
    if (!cancelReasonType && !cancellationReason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a cancellation reason',
        variant: 'destructive',
      })
      return
    }

    setCancelling(true)
    try {
      const reason = cancelReasonType || cancellationReason.trim()
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: reason }),
      })

      const data = await response.json()

      if (response.ok) {
        setShowCancelDialog(false)
        setCancellationReason('')
        setCancelReasonType('')
        fetchOrder()
        toast({
          title: 'Order Cancelled',
          description: data.message || 'Order has been cancelled successfully',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Cancellation Failed',
          description: data.error || 'Failed to cancel order',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to cancel order:', error)
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel order. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setCancelling(false)
    }
  }

  const getStatusSteps = () => {
    if (!order) return []
    
    const steps = [
      { key: 'PAID', label: 'Payment Confirmed', icon: CheckCircle, completed: order.status !== 'PENDING' },
      { key: 'PREPARING', label: 'Preparing Order', icon: Clock, completed: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
      { key: 'OUT_FOR_DELIVERY', label: 'Ready for Delivery', icon: Truck, completed: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
      { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle, completed: order.status === 'DELIVERED' },
    ]
    return steps
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

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
            <Link href="/seller/orders">
              <Button>View All Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusSteps = getStatusSteps()
  const canUpdateToPreparing = order.status === 'PAID'
  const canUpdateToOutForDelivery = order.status === 'PREPARING'
  const canCancel = ['PENDING', 'PAID', 'PREPARING'].includes(order.status)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/seller/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Order #{order.orderNumber}</h1>
          <p className="text-gray-600">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Status Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {statusSteps.map((step, index) => {
                const StepIcon = step.icon
                const isActive = step.completed
                const isLast = index === statusSteps.length - 1

                return (
                  <div key={step.key} className="relative">
                    <div className="flex items-start gap-4 pb-6">
                      <div className="relative">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          <StepIcon className="h-5 w-5" />
                        </div>
                        {!isLast && (
                          <div className={`absolute left-1/2 top-10 w-0.5 h-6 transform -translate-x-1/2 ${
                            isActive ? 'bg-primary' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 pt-2">
                        <p className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                          {step.label}
                        </p>
                        {step.key === 'DELIVERED' && order.deliveredAt && (
                          <p className="text-sm text-gray-500 mt-1">
                            Delivered on {new Date(order.deliveredAt).toLocaleDateString()}
                          </p>
                        )}
                        {step.key === 'OUT_FOR_DELIVERY' && order.delivery?.rider && (
                          <p className="text-sm text-gray-500 mt-1">
                            Rider: {order.delivery.rider.name || 'Assigned'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                      {item.product.images[0] && (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.name}</h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.pricingUnit.unit} × {formatCurrency(item.pricingUnit.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.total)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">Name</p>
                  <p className="text-sm text-gray-600">{order.buyer.name || order.buyer.email}</p>
                </div>
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-600">{order.buyer.email}</p>
                </div>
                {order.buyer.phoneNumber && (
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-sm text-gray-600">{order.buyer.phoneNumber}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Delivery Address</p>
                    <p className="text-sm text-gray-600">
                      {order.deliveryAddress}, {order.deliveryCity}, {order.deliveryState}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">Contact Phone</p>
                    <p className="text-sm text-gray-600">{order.deliveryPhone}</p>
                  </div>
                </div>
                {order.notes && (
                  <div>
                    <p className="font-medium">Delivery Notes</p>
                    <p className="text-sm text-gray-600">{order.notes}</p>
                  </div>
                )}
                {order.delivery?.rider && (
                  <div>
                    <p className="font-medium">Delivery Rider</p>
                    <p className="text-sm text-gray-600">
                      {order.delivery.rider.name || 'Assigned'}
                      {order.delivery.rider.phoneNumber && ` • ${order.delivery.rider.phoneNumber}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {(canUpdateToPreparing || canUpdateToOutForDelivery || canCancel) && (
              <Card>
                <CardHeader>
                  <CardTitle>Order Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canUpdateToPreparing && (
                    <Button
                      onClick={() => handleUpdateStatus('PREPARING')}
                      disabled={updating}
                      className="w-full"
                      size="lg"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Start Preparing Order
                        </>
                      )}
                    </Button>
                  )}

                  {canUpdateToOutForDelivery && (
                    <Button
                      onClick={() => handleUpdateStatus('OUT_FOR_DELIVERY')}
                      disabled={updating}
                      className="w-full"
                      size="lg"
                      variant="outline"
                    >
                      {updating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Truck className="h-4 w-4 mr-2" />
                          Mark Ready for Delivery
                        </>
                      )}
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      onClick={() => setShowCancelDialog(true)}
                      disabled={updating || cancelling}
                      className="w-full"
                      size="lg"
                      variant="destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Order
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Platform Fee</span>
                  <span>{formatCurrency(order.platformFee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee</span>
                  <span>{formatCurrency(order.deliveryFee)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </div>
                {order.payment && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Payment Status:</span>
                      <span className={`font-medium ${
                        order.payment.status === 'RELEASED' ? 'text-green-600' :
                        order.payment.status === 'COMPLETED' ? 'text-blue-600' :
                        'text-yellow-600'
                      }`}>
                        {order.payment.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Escrow Status:</span>
                      <span className={`font-medium ${
                        order.payment.escrowStatus === 'RELEASED' ? 'text-green-600' :
                        order.payment.escrowStatus === 'HELD' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        {order.payment.escrowStatus}
                      </span>
                    </div>
                    {order.payment.releasedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Released on {new Date(order.payment.releasedAt).toLocaleDateString()}
                      </p>
                    )}
                    {order.payment.escrowStatus === 'HELD' && order.status === 'DELIVERED' && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Payment will be released automatically
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancelling this order. The buyer will be notified and refunded if payment was made.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cancelReasonType">Cancellation Reason *</Label>
              <select
                id="cancelReasonType"
                value={cancelReasonType}
                onChange={(e) => {
                  setCancelReasonType(e.target.value)
                  if (e.target.value) setCancellationReason('')
                }}
                className="w-full mt-2 px-3 py-2 border rounded-md"
              >
                <option value="">Select a reason...</option>
                <option value="Out of stock">Out of stock</option>
                <option value="Damaged goods">Damaged goods</option>
                <option value="Unable to fulfill">Unable to fulfill order</option>
                <option value="Quality issue">Quality concerns</option>
                <option value="Other">Other (specify below)</option>
              </select>
            </div>
            {cancelReasonType === 'Other' && (
              <div>
                <Label htmlFor="customReason">Custom Reason *</Label>
                <Input
                  id="customReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  className="mt-2"
                />
              </div>
            )}
            {!cancelReasonType && (
              <div>
                <Label htmlFor="cancellationReason">Cancellation Reason *</Label>
                <Input
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Enter cancellation reason..."
                  className="mt-2"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCancelDialog(false)
                setCancellationReason('')
                setCancelReasonType('')
              }}
              disabled={cancelling}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelOrder}
              disabled={cancelling || (!cancelReasonType && !cancellationReason.trim())}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
