'use client'

/**
 * Order Detail Page (Buyer View)
 * 
 * Shows order details, status timeline, and allows review submission
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { 
  Package, 
  MapPin, 
  Phone, 
  Clock, 
  CheckCircle, 
  Truck, 
  Star,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import DeliveryTrackingMap from '@/components/delivery-tracking-map'
import { useOrderStream } from '@/hooks/use-order-stream'
import { useToast } from '@/hooks/use-toast'
import { useCart } from '@/hooks/use-cart'
import { ShoppingCart, RotateCcw } from 'lucide-react'

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
  status: string
  subtotal: number
  platformFee: number
  deliveryFee: number
  total: number
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryPhone: string
  deliveryLatitude: number | null
  deliveryLongitude: number | null
  notes: string | null
  createdAt: string
  deliveredAt: string | null
  shop: {
    id: string
    name: string
    latitude: number | null
    longitude: number | null
  }
  items: OrderItem[]
  payment: {
    id: string
    status: string
    escrowStatus: string
    paidAt: string | null
  } | null
  delivery: {
    id: string
    status: string
    rider: {
      id: string
      name: string | null
      phoneNumber: string | null
    } | null
    riderLatitude: number | null
    riderLongitude: number | null
    pickedUpAt: string | null
    deliveredAt: string | null
  } | null
  review: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
  } | null
  riderRating: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
  } | null
  dispute: {
    id: string
    status: string
  } | null
}

export default function OrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, status } = useAuth()
  const orderId = params.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reordering, setReordering] = useState(false)
  const [submittingRiderRating, setSubmittingRiderRating] = useState(false)
  const [reviewData, setReviewData] = useState({
    rating: 5,
    comment: '',
  })
  const [riderRatingData, setRiderRatingData] = useState({
    rating: 5,
    comment: '',
  })
  const { toast } = useToast()
  const { addToCart } = useCart()

  // Real-time order updates
  const { isConnected, lastUpdate } = useOrderStream({
    orderId,
    enabled: !!order && !!user,
    onUpdate: (update) => {
      if (update.type === 'order_status_update' && update.order) {
        setOrder((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            status: update.order!.status,
            deliveredAt: update.order!.deliveredAt || prev.deliveredAt,
          }
        })
        toast({
          title: 'Order Status Updated',
          description: `Your order status has been updated to: ${update.order!.status.replace('_', ' ')}`,
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
        if (update.status === 'IN_TRANSIT') {
          toast({
            title: 'Order Out for Delivery',
            description: 'Your order is on the way!',
            variant: 'success',
          })
        } else if (update.status === 'DELIVERED') {
          toast({
            title: 'Order Delivered!',
            description: 'Your order has been delivered successfully.',
            variant: 'success',
          })
        }
      } else if (update.type === 'rider_location_update') {
        setOrder((prev) => {
          if (!prev || !prev.delivery) return prev
          return {
            ...prev,
            delivery: {
              ...prev.delivery,
              riderLatitude: update.latitude!,
              riderLongitude: update.longitude!,
            },
          }
        })
      }
    },
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (status === 'authenticated' && user) {
      fetchOrder()
    }
  }, [orderId, status, user, router])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
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

  const handleReorder = async () => {
    if (!order) return

    setReordering(true)
    try {
      const unavailableItems: string[] = []
      const addedItems: string[] = []

      // Check each item and add to cart
      for (const item of order.items) {
        try {
          // Fetch current product and pricing unit info
          const productResponse = await fetch(`/api/products/${item.product.id}`)
          if (!productResponse.ok) {
            unavailableItems.push(item.product.name)
            continue
          }

          const productData = await productResponse.json()
          const product = productData.product

          // Check if product is still available
          if (!product.isAvailable) {
            unavailableItems.push(item.product.name)
            continue
          }

          // Find the pricing unit
          const pricingUnit = product.pricingUnits.find(
            (pu: any) => pu.id === item.pricingUnit.id
          )

          if (!pricingUnit || !pricingUnit.isActive) {
            unavailableItems.push(item.product.name)
            continue
          }

          // Check stock availability
          if (pricingUnit.stock !== null && pricingUnit.stock < item.quantity) {
            unavailableItems.push(`${item.product.name} (insufficient stock)`)
            // Add available quantity if stock > 0
            if (pricingUnit.stock > 0) {
              addToCart({
                productId: product.id,
                productName: product.name,
                productImage: product.images[0] || '',
                pricingUnitId: pricingUnit.id,
                unit: pricingUnit.unit,
                price: pricingUnit.price,
                quantity: pricingUnit.stock,
                shopId: order.shop.id,
                shopName: order.shop.name,
              })
              addedItems.push(`${item.product.name} (${pricingUnit.stock} ${pricingUnit.unit} available)`)
            }
            continue
          }

          // Add item to cart
          addToCart({
            productId: product.id,
            productName: product.name,
            productImage: product.images[0] || '',
            pricingUnitId: pricingUnit.id,
            unit: pricingUnit.unit,
            price: pricingUnit.price,
            quantity: item.quantity,
            shopId: order.shop.id,
            shopName: order.shop.name,
          })
          addedItems.push(item.product.name)
        } catch (error) {
          console.error(`Failed to add ${item.product.name} to cart:`, error)
          unavailableItems.push(item.product.name)
        }
      }

      // Show results
      if (unavailableItems.length === 0) {
        toast({
          title: 'Items Added to Cart',
          description: `All ${addedItems.length} item(s) from this order have been added to your cart.`,
          variant: 'default',
        })
        router.push('/cart')
      } else if (addedItems.length > 0) {
        toast({
          title: 'Partial Reorder',
          description: `${addedItems.length} item(s) added. ${unavailableItems.length} item(s) unavailable: ${unavailableItems.join(', ')}`,
          variant: 'default',
        })
        router.push('/cart')
      } else {
        toast({
          title: 'Reorder Failed',
          description: `None of the items are available. Unavailable items: ${unavailableItems.join(', ')}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to reorder:', error)
      toast({
        title: 'Reorder Failed',
        description: 'Failed to add items to cart. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setReordering(false)
    }
  }

  const handleSubmitRiderRating = async () => {
    if (!order || !order.delivery?.id) return

    setSubmittingRiderRating(true)
    try {
      const response = await fetch('/api/rider-ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryId: order.delivery.id,
          orderId: order.id,
          rating: riderRatingData.rating,
          comment: riderRatingData.comment.trim() || null,
        }),
      })

      if (response.ok) {
        // Refresh order to show rating
        fetchOrder()
        setRiderRatingData({ rating: 5, comment: '' })
        toast({
          title: 'Rating Submitted',
          description: 'Thank you for rating the rider!',
          variant: 'default',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Submission Failed',
          description: data.error || 'Failed to submit rider rating',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to submit rider rating:', error)
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit rider rating',
        variant: 'destructive',
      })
    } finally {
      setSubmittingRiderRating(false)
    }
  }

  const handleSubmitReview = async () => {
    if (!order) return

    setSubmittingReview(true)
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          rating: reviewData.rating,
          comment: reviewData.comment.trim() || null,
        }),
      })

      if (response.ok) {
        // Refresh order to show review
        fetchOrder()
        setReviewData({ rating: 5, comment: '' })
        toast({
          title: 'Review Submitted',
          description: 'Thank you for your review!',
          variant: 'success',
        })
      } else {
        const data = await response.json()
        toast({
          title: 'Submission Failed',
          description: data.error || 'Failed to submit review',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to submit review:', error)
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit review',
        variant: 'destructive',
      })
    } finally {
      setSubmittingReview(false)
    }
  }

  const getStatusSteps = () => {
    if (!order) return []
    
    const steps = [
      { key: 'PENDING', label: 'Order Placed', icon: Package, completed: true },
      { key: 'PAID', label: 'Payment Confirmed', icon: CheckCircle, completed: order.status !== 'PENDING' },
      { key: 'PREPARING', label: 'Preparing', icon: Clock, completed: ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
      { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck, completed: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) },
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
            <Link href="/orders">
              <Button>View All Orders</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusSteps = getStatusSteps()
  const canReview = order.status === 'DELIVERED' && !order.review
  const canReorder = order.status === 'DELIVERED' || order.status === 'CANCELLED'
  const canRateRider = 
    order.status === 'DELIVERED' && 
    order.delivery?.rider && 
    order.delivery.status === 'DELIVERED' &&
    !order.riderRating

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
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
            {isConnected && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
            )}
          </div>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Order Items</CardTitle>
                  {canReorder && (
                    <Button
                      onClick={handleReorder}
                      disabled={reordering}
                      variant="outline"
                      size="sm"
                    >
                      {reordering ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reorder
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
                {canReorder && (
                  <div className="mt-4 pt-4 border-t">
                    <Button
                      onClick={handleReorder}
                      disabled={reordering}
                      className="w-full"
                      variant="outline"
                    >
                      {reordering ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding Items to Cart...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reorder All Items
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Add all items from this order to your cart. Unavailable items will be skipped.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Delivery Tracking Map */}
                {(order.deliveryLatitude && order.deliveryLongitude && order.shop.latitude && order.shop.longitude) && (
                  <div className="mb-4">
                    <DeliveryTrackingMap
                      shopLatitude={order.shop.latitude}
                      shopLongitude={order.shop.longitude}
                      shopName={order.shop.name}
                      deliveryLatitude={order.deliveryLatitude}
                      deliveryLongitude={order.deliveryLongitude}
                      deliveryAddress={order.deliveryAddress}
                      riderLatitude={order.delivery?.riderLatitude}
                      riderLongitude={order.delivery?.riderLongitude}
                      riderName={order.delivery?.rider?.name || null}
                      deliveryStatus={order.delivery?.status}
                    />
                  </div>
                )}

                <div className="space-y-3">
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
                </div>
              </CardContent>
            </Card>

            {/* Review Section */}
            {canReview && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Leave a Review
                  </CardTitle>
                  <CardDescription>
                    Share your experience with {order.shop.name}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setReviewData({ ...reviewData, rating })}
                          className={`p-2 rounded ${
                            reviewData.rating >= rating
                              ? 'bg-yellow-100 text-yellow-500'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Star className={`h-5 w-5 ${reviewData.rating >= rating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="comment">Comment (Optional)</Label>
                    <Input
                      id="comment"
                      value={reviewData.comment}
                      onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                      placeholder="Share your experience..."
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submittingReview}
                    className="w-full"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Review'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Existing Review */}
            {order.review && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Your Review
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 ${
                          order.review!.rating >= rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {order.review.comment && (
                    <p className="text-gray-700 mt-2">{order.review.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Reviewed on {new Date(order.review.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Rider Rating Section */}
            {canRateRider && order.delivery?.rider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    Rate Your Rider
                  </CardTitle>
                  <CardDescription>
                    How was your delivery experience with {order.delivery.rider.name || 'the rider'}?
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Rating</Label>
                    <div className="flex gap-2 mt-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setRiderRatingData({ ...riderRatingData, rating })}
                          className={`p-2 rounded ${
                            riderRatingData.rating >= rating
                              ? 'bg-blue-100 text-blue-500'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          <Star className={`h-5 w-5 ${riderRatingData.rating >= rating ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="rider-comment">Comment (Optional)</Label>
                    <Input
                      id="rider-comment"
                      value={riderRatingData.comment}
                      onChange={(e) => setRiderRatingData({ ...riderRatingData, comment: e.target.value })}
                      placeholder="Share your delivery experience..."
                      className="mt-2"
                    />
                  </div>
                  <Button
                    onClick={handleSubmitRiderRating}
                    disabled={submittingRiderRating}
                    className="w-full"
                  >
                    {submittingRiderRating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Rating'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Existing Rider Rating */}
            {order.riderRating && order.delivery?.rider && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-500" />
                    Your Rider Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`h-5 w-5 ${
                          order.riderRating!.rating >= rating
                            ? 'text-blue-500 fill-blue-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  {order.riderRating.comment && (
                    <p className="text-gray-700 mt-2">{order.riderRating.comment}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Rated on {new Date(order.riderRating.createdAt).toLocaleDateString()}
                  </p>
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
                {order.payment?.paidAt && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500">
                      Paid on {new Date(order.payment.paidAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {order.status === 'PENDING' && (
                  <Link href={`/orders/${order.id}/payment`} className="block mt-4">
                    <Button className="w-full">Complete Payment</Button>
                  </Link>
                )}
                {order.status !== 'PENDING' && order.status !== 'CANCELLED' && !order.dispute && (
                  <Link href={`/orders/${order.id}/dispute`} className="block mt-4">
                    <Button variant="outline" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Create Dispute
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
