'use client'

/**
 * Seller Orders Page
 * 
 * View and manage orders from customers
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { OrderStatus } from '@prisma/client'
import { Package, ArrowLeft, CheckCircle, Clock, Truck, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  buyer: {
    name: string | null
    email: string
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
  delivery: {
    status: string
  } | null
  createdAt: string
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<OrderStatus | 'ALL'>('ALL')
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<OrderStatus | null>(null)
  const [processingBulk, setProcessingBulk] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/seller/orders')
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const response = await fetch(`/api/seller/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        fetchOrders()
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
    }
  }

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(orderId)) {
        newSet.delete(orderId)
      } else {
        newSet.add(orderId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set())
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)))
    }
  }

  const handleBulkUpdate = async () => {
    if (!bulkAction || selectedOrders.size === 0) return

    setProcessingBulk(true)
    try {
      const response = await fetch('/api/seller/orders/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderIds: Array.from(selectedOrders),
          status: bulkAction,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Bulk Update Successful',
          description: `Updated ${data.updatedCount} order(s) to ${bulkAction.replace('_', ' ')}`,
          variant: 'success',
        })
        setSelectedOrders(new Set())
        setBulkAction(null)
        fetchOrders()
      } else {
        const data = await response.json()
        toast({
          title: 'Bulk Update Failed',
          description: data.error || 'Failed to update orders',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to bulk update orders:', error)
      toast({
        title: 'Bulk Update Failed',
        description: 'Failed to update orders',
        variant: 'destructive',
      })
    } finally {
      setProcessingBulk(false)
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'PREPARING':
      case 'OUT_FOR_DELIVERY':
        return <Truck className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800'
      case 'PREPARING':
      case 'OUT_FOR_DELIVERY':
        return 'bg-blue-100 text-blue-800'
      case 'CANCELLED':
      case 'DISPUTED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const filteredOrders = orders.filter(
    (order) => filter === 'ALL' || order.status === filter
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Orders</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage customer orders</p>
          </div>
          <Link href="/seller/dashboard">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-4 sm:mb-6 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'ALL' ? 'default' : 'outline'}
              onClick={() => setFilter('ALL')}
              size="sm"
            >
              All ({orders.length})
            </Button>
            {Object.values(OrderStatus).map((status) => {
              const count = orders.filter((o) => o.status === status).length
              return (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'outline'}
                  onClick={() => setFilter(status)}
                  size="sm"
                >
                  {status.replace('_', ' ')} ({count})
                </Button>
              )
            })}
          </div>

          {/* Bulk Actions */}
          {selectedOrders.size > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm sm:text-base text-blue-900">
                        {selectedOrders.size} order(s) selected
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      <select
                        value={bulkAction || ''}
                        onChange={(e) => setBulkAction(e.target.value as OrderStatus)}
                        className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto"
                      >
                        <option value="">Select action...</option>
                        <option value="PREPARING">Mark as Preparing</option>
                        <option value="OUT_FOR_DELIVERY">Mark as Ready for Delivery</option>
                      </select>
                      <Button
                        onClick={handleBulkUpdate}
                        disabled={!bulkAction || processingBulk}
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        {processingBulk ? 'Processing...' : 'Apply to Selected'}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedOrders(new Set())
                          setBulkAction(null)
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
              </CardContent>
            </Card>
          )}
        </div>

        {filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {filter === 'ALL' ? 'No orders yet' : `No ${filter.toLowerCase()} orders`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.length > 0 && (
              <div className="flex items-center gap-2 pb-2 border-b">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedOrders.size === filteredOrders.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>Select All</span>
                </button>
              </div>
            )}
            {filteredOrders.map((order) => (
              <Card 
                key={order.id} 
                className={`hover:shadow-md transition-shadow ${
                  selectedOrders.has(order.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => handleSelectOrder(order.id)}
                      className="mt-1 flex-shrink-0"
                    >
                      {selectedOrders.has(order.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                    <Link href={`/seller/orders/${order.id}`} className="flex-1">
                      <CardTitle className="text-lg hover:text-primary">Order #{order.orderNumber}</CardTitle>
                      <CardDescription className="mt-1">
                        {order.buyer.name || order.buyer.email} •{' '}
                        {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </Link>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Items:</h4>
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span>
                              {item.product.name} - {item.quantity} {item.pricingUnit.unit}
                            </span>
                            <span className="font-medium">{formatCurrency(item.total)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="text-xl font-bold ml-2">
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <Link href={`/seller/orders/${order.id}`}>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </Link>
                        {order.status === 'PAID' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                            size="sm"
                          >
                            Start Preparing
                          </Button>
                        )}

                        {order.status === 'PREPARING' && (
                          <Button
                            onClick={() => handleUpdateStatus(order.id, 'OUT_FOR_DELIVERY')}
                            size="sm"
                            variant="outline"
                          >
                            Ready for Delivery
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
      </div>
    </div>
  )
}
