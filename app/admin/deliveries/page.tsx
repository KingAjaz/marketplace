'use client'

/**
 * Admin Delivery Management Page
 * 
 * View all deliveries, filter by status, and assign riders
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { DeliveryStatus, OrderStatus } from '@prisma/client'
import { Package, ArrowLeft, Clock, CheckCircle, Truck, MapPin, User, Loader2, Users } from 'lucide-react'
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

interface Delivery {
  id: string
  orderId: string
  riderId: string | null
  status: DeliveryStatus
  estimatedTime: string | null
  pickedUpAt: string | null
  deliveredAt: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    status: OrderStatus
    total: number
    deliveryAddress: string
    deliveryCity: string
    deliveryState: string
    deliveryPhone: string
    deliveryLatitude: number | null
    deliveryLongitude: number | null
    createdAt: string
    shop: {
      id: string
      name: string
      address: string | null
      city: string | null
      state: string | null
      latitude: number | null
      longitude: number | null
    }
    buyer: {
      id: string
      name: string | null
      email: string
      phoneNumber: string | null
    }
  }
  rider: {
    id: string
    name: string | null
    email: string
    phoneNumber: string | null
  } | null
}

interface Rider {
  id: string
  name: string | null
  email: string
  phoneNumber: string | null
  activeDeliveries: number
  completedDeliveries: number
}

interface DeliveryCounts {
  pending: number
  assigned: number
  pickedUp: number
  inTransit: number
  delivered: number
  failed: number
  total: number
}

export default function AdminDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRiders, setLoadingRiders] = useState(false)
  const [filter, setFilter] = useState<string>('ALL')
  const [counts, setCounts] = useState<DeliveryCounts>({
    pending: 0,
    assigned: 0,
    pickedUp: 0,
    inTransit: 0,
    delivered: 0,
    failed: 0,
    total: 0,
  })
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [selectedRiderId, setSelectedRiderId] = useState<string>('')
  const [assigning, setAssigning] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDeliveries()
    fetchRiders()
  }, [filter])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const params = filter !== 'ALL' ? `?status=${filter}` : ''
      const response = await fetch(`/api/admin/deliveries${params}`)
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data.deliveries || [])
        setCounts(data.counts || counts)
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch deliveries',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchRiders = async () => {
    try {
      setLoadingRiders(true)
      const response = await fetch('/api/admin/riders/available')
      if (response.ok) {
        const data = await response.json()
        setRiders(data.riders || [])
      }
    } catch (error) {
      console.error('Failed to fetch riders:', error)
    } finally {
      setLoadingRiders(false)
    }
  }

  const handleAssignRider = async () => {
    if (!selectedDelivery || !selectedRiderId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a rider',
        variant: 'destructive',
      })
      return
    }

    setAssigning(true)
    try {
      const response = await fetch(`/api/admin/deliveries/${selectedDelivery.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: selectedRiderId }),
      })

      if (response.ok) {
        toast({
          title: 'Rider Assigned',
          description: 'Rider assigned to delivery successfully',
          variant: 'success',
        })
        setAssignDialogOpen(false)
        setSelectedDelivery(null)
        setSelectedRiderId('')
        fetchDeliveries()
        fetchRiders() // Refresh rider stats
      } else {
        const data = await response.json()
        toast({
          title: 'Assignment Failed',
          description: data.error || 'Failed to assign rider',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to assign rider:', error)
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign rider',
        variant: 'destructive',
      })
    } finally {
      setAssigning(false)
    }
  }

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return <Truck className="h-4 w-4 text-blue-500" />
      case 'ASSIGNED':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'FAILED':
        return <Clock className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'PICKED_UP':
      case 'IN_TRANSIT':
        return 'bg-blue-100 text-blue-800'
      case 'ASSIGNED':
        return 'bg-purple-100 text-purple-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredDeliveries = deliveries.filter(
    (delivery) => filter === 'ALL' || delivery.status === filter
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading deliveries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Delivery Management</h1>
          <p className="text-gray-600">Manage deliveries and assign riders</p>
        </div>

        {/* Status Filter Buttons */}
        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            size="sm"
          >
            All ({counts.total})
          </Button>
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
            size="sm"
          >
            Pending ({counts.pending})
          </Button>
          <Button
            variant={filter === 'ASSIGNED' ? 'default' : 'outline'}
            onClick={() => setFilter('ASSIGNED')}
            size="sm"
          >
            Assigned ({counts.assigned})
          </Button>
          <Button
            variant={filter === 'PICKED_UP' ? 'default' : 'outline'}
            onClick={() => setFilter('PICKED_UP')}
            size="sm"
          >
            Picked Up ({counts.pickedUp})
          </Button>
          <Button
            variant={filter === 'IN_TRANSIT' ? 'default' : 'outline'}
            onClick={() => setFilter('IN_TRANSIT')}
            size="sm"
          >
            In Transit ({counts.inTransit})
          </Button>
          <Button
            variant={filter === 'DELIVERED' ? 'default' : 'outline'}
            onClick={() => setFilter('DELIVERED')}
            size="sm"
          >
            Delivered ({counts.delivered})
          </Button>
          <Button
            variant={filter === 'FAILED' ? 'default' : 'outline'}
            onClick={() => setFilter('FAILED')}
            size="sm"
          >
            Failed ({counts.failed})
          </Button>
        </div>

        {/* Deliveries List */}
        {filteredDeliveries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {filter === 'ALL' ? 'No deliveries found' : `No ${filter.toLowerCase()} deliveries`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDeliveries.map((delivery) => (
              <Card key={delivery.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(delivery.status)}
                        <CardTitle className="text-lg">
                          Order #{delivery.order.orderNumber}
                        </CardTitle>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            delivery.status
                          )}`}
                        >
                          {delivery.status.replace('_', ' ')}
                        </span>
                      </div>
                      <CardDescription className="mt-1">
                        Shop: {delivery.order.shop.name} •{' '}
                        {new Date(delivery.order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="text-xl font-bold">{formatCurrency(delivery.order.total)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Delivery Address</p>
                        <div className="flex items-start gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{delivery.order.deliveryAddress}</p>
                            <p>
                              {delivery.order.deliveryCity}, {delivery.order.deliveryState}
                            </p>
                            <p className="mt-1">Phone: {delivery.order.deliveryPhone}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Buyer</p>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          <div>
                            <p>{delivery.order.buyer.name || delivery.order.buyer.email}</p>
                            {delivery.order.buyer.phoneNumber && (
                              <p className="text-xs">{delivery.order.buyer.phoneNumber}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {delivery.order.shop.address && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Pickup Location</p>
                          <div className="flex items-start gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <p>{delivery.order.shop.address}</p>
                              <p>
                                {delivery.order.shop.city}, {delivery.order.shop.state}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Rider</p>
                        {delivery.rider ? (
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="font-medium">{delivery.rider.name || delivery.rider.email}</p>
                              {delivery.rider.phoneNumber && (
                                <p className="text-xs text-gray-500">{delivery.rider.phoneNumber}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not assigned</p>
                        )}
                      </div>

                      {delivery.estimatedTime && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Estimated Delivery</p>
                          <p className="text-sm text-gray-600">
                            {new Date(delivery.estimatedTime).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {delivery.pickedUpAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Picked Up At</p>
                          <p className="text-sm text-gray-600">
                            {new Date(delivery.pickedUpAt).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {delivery.deliveredAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">Delivered At</p>
                          <p className="text-sm text-gray-600">
                            {new Date(delivery.deliveredAt).toLocaleString()}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Link href={`/orders/${delivery.order.id}`}>
                          <Button variant="outline" size="sm">
                            View Order
                          </Button>
                        </Link>
                        {delivery.status === 'PENDING' && !delivery.riderId && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedDelivery(delivery)
                              setSelectedRiderId('')
                              setAssignDialogOpen(true)
                            }}
                          >
                            Assign Rider
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Assign Rider Dialog */}
        {selectedDelivery && (
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Rider to Delivery</DialogTitle>
                <DialogDescription>
                  Select a rider to assign to order #{selectedDelivery.order.orderNumber}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                {loadingRiders ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading riders...</p>
                  </div>
                ) : riders.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No approved riders available
                  </p>
                ) : (
                  <>
                    <div>
                      <label htmlFor="rider-select" className="block text-sm font-medium mb-2">
                        Select Rider
                      </label>
                      <select
                        id="rider-select"
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">-- Select a rider --</option>
                        {riders.map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.name || rider.email} ({rider.activeDeliveries} active)
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedRiderId && (
                      <div className="p-3 bg-gray-50 rounded-md border">
                        {(() => {
                          const rider = riders.find((r) => r.id === selectedRiderId)
                          return rider ? (
                            <div className="text-sm">
                              <p className="font-medium text-gray-900">{rider.name || rider.email}</p>
                              {rider.phoneNumber && (
                                <p className="text-gray-600 mt-1">{rider.phoneNumber}</p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Active Deliveries: {rider.activeDeliveries} • Completed:{' '}
                                {rider.completedDeliveries}
                              </p>
                            </div>
                          ) : null
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false)
                    setSelectedDelivery(null)
                    setSelectedRiderId('')
                  }}
                  disabled={assigning}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignRider}
                  disabled={!selectedRiderId || assigning}
                >
                  {assigning ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    'Assign Rider'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
