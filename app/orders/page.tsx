'use client'

/**
 * Buyer Orders Page
 * 
 * List all orders for the current buyer
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Package, ArrowRight, CheckCircle, Clock, Truck, XCircle, Search, Filter, Download, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OrderStatus } from '@prisma/client'
import { useToast } from '@/hooks/use-toast'

interface Order {
  id: string
  orderNumber: string
  status: string
  total: number
  shop: {
    name: string
  }
  items: {
    id: string
    quantity: number
    product: {
      name: string
    }
    pricingUnit: {
      unit: string
    }
  }[]
  payment: {
    status: string
  } | null
  createdAt: string
}

interface Shop {
  id: string
  name: string
}

export default function OrdersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [shopFilter, setShopFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortBy, setSortBy] = useState<string>('newest')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    if (session) {
      fetchOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, statusFilter, shopFilter, searchQuery, startDate, endDate, sortBy])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (shopFilter !== 'all') params.append('shopId', shopFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)
      if (sortBy) params.append('sortBy', sortBy)

      const response = await fetch(`/api/orders?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setOrders(data.orders || [])
        setShops(data.shops || [])
      } else {
        throw new Error('Failed to fetch orders')
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error)
      toast({
        title: 'Error',
        description: 'Failed to load orders. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (orders.length === 0) {
      toast({
        title: 'No Orders',
        description: 'No orders to export',
        variant: 'destructive',
      })
      return
    }

    setExporting(true)
    try {
      // Create CSV content
      const headers = ['Order Number', 'Shop', 'Status', 'Total', 'Date', 'Payment Status']
      const rows = orders.map((order) => [
        order.orderNumber,
        order.shop.name,
        order.status,
        formatCurrency(order.total),
        new Date(order.createdAt).toLocaleDateString(),
        order.payment?.status || 'N/A',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `orders-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Success',
        description: 'Order history exported successfully',
        variant: 'default',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export order history',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'OUT_FOR_DELIVERY':
      case 'PREPARING':
        return <Truck className="h-4 w-4 text-blue-500" />
      case 'CANCELLED':
      case 'DISPUTED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">My Orders</h1>
            <p className="text-sm sm:text-base text-gray-600">Track and manage your orders</p>
          </div>
          {!loading && orders.length > 0 && (
            <Button
              onClick={handleExport}
              disabled={exporting}
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </>
              )}
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm">Search Order Number</Label>
                <div className="relative mt-1 sm:mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Order #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-1 sm:mt-2 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="ALL">All Status</option>
                  {Object.values(OrderStatus).map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="shop" className="text-sm">Shop</Label>
                <select
                  id="shop"
                  value={shopFilter}
                  onChange={(e) => setShopFilter(e.target.value)}
                  className="w-full mt-1 sm:mt-2 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="all">All Shops</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="sortBy" className="text-sm">Sort By</Label>
                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full mt-1 sm:mt-2 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="amount_high">Amount (High to Low)</option>
                  <option value="amount_low">Amount (Low to High)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate" className="text-sm">Start Date (Optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 sm:mt-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="endDate" className="text-sm">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 sm:mt-2 text-sm"
                />
              </div>
            </div>
            {(statusFilter !== 'ALL' || shopFilter !== 'all' || searchQuery || startDate || endDate) && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setShopFilter('all')
                    setSearchQuery('')
                    setStartDate('')
                    setEndDate('')
                    setSortBy('newest')
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {searchQuery || statusFilter !== 'ALL' || shopFilter !== 'all' || startDate || endDate
                  ? 'No orders match your filters'
                  : 'No orders yet'}
              </h2>
              <p className="text-gray-600 mb-4">
                {searchQuery || statusFilter !== 'ALL' || shopFilter !== 'all' || startDate || endDate
                  ? 'Try adjusting your filters'
                  : 'Start shopping to see your orders here'}
              </p>
              {searchQuery || statusFilter !== 'ALL' || shopFilter !== 'all' || startDate || endDate ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setShopFilter('all')
                    setSearchQuery('')
                    setStartDate('')
                    setEndDate('')
                  }}
                >
                  Clear Filters
                </Button>
              ) : (
                <Link href="/market">
                  <Button>Browse Marketplace</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="mb-3 sm:mb-4 text-xs sm:text-sm text-gray-600">
              Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
            </div>
            <div className="space-y-3 sm:space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <Link href={`/orders/${order.id}`}>
                        <CardTitle className="text-base sm:text-lg hover:text-primary break-words">
                          Order #{order.orderNumber}
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {order.shop.name} • {new Date(order.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(order.status)}
                      <span
                        className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">Items:</h4>
                      <div className="space-y-1">
                        {order.items.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs sm:text-sm text-gray-600"
                          >
                            <span className="break-words pr-2">
                              {item.product.name} - {item.quantity} {item.pricingUnit.unit}
                            </span>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs sm:text-sm text-gray-500">
                            +{order.items.length - 3} more item(s)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
                      <div>
                        <span className="text-xs sm:text-sm text-gray-600">Total:</span>
                        <span className="text-lg sm:text-xl font-bold ml-2">
                          {formatCurrency(order.total)}
                        </span>
                      </div>

                      <Link href={`/orders/${order.id}`} className="w-full sm:w-auto">
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
