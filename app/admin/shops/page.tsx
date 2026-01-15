'use client'

/**
 * Admin Shops Management Page
 * 
 * Allows admins to view all shops, filter by status/rating, view shop details,
 * and deactivate/activate shops
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Store,
  Search,
  Filter,
  Power,
  PowerOff,
  Star,
  DollarSign,
  ShoppingBag,
  Package,
  MessageSquare,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface ShopData {
  id: string
  name: string
  description: string | null
  logo: string | null
  banner: string | null
  address: string | null
  city: string | null
  state: string | null
  isActive: boolean
  rating: number
  totalReviews: number
  createdAt: string
  updatedAt: string
  seller: {
    id: string
    name: string | null
    email: string
    phoneNumber: string | null
    sellerStatus: string | null
    isActive: boolean
  }
  stats: {
    totalProducts: number
    totalOrders: number
    totalReviews: number
    revenue: number
    recentRevenue: number
  }
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShop, setSelectedShop] = useState<ShopData | null>(null)
  const [shopDetails, setShopDetails] = useState<any | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [minRatingFilter, setMinRatingFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchShops()
  }, [statusFilter, minRatingFilter, searchQuery])

  const fetchShops = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (minRatingFilter) params.append('minRating', minRatingFilter)
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/shops?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch shops')
      }
      const data = await response.json()
      setShops(data.shops || [])
    } catch (error: any) {
      console.error('Failed to fetch shops:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load shops',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (shop: ShopData) => {
    setSelectedShop(shop)
    setShowDeactivateDialog(true)
  }

  const confirmDeactivate = async () => {
    if (!selectedShop) return

    setProcessing(selectedShop.id)
    try {
      const response = await fetch(`/api/admin/shops/${selectedShop.id}/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedShop.isActive ? 'deactivate' : 'activate',
          reason: deactivateReason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update shop status')
      }

      setShowDeactivateDialog(false)
      setDeactivateReason('')
      await fetchShops()
      toast({
        title: 'Success',
        description: selectedShop.isActive
          ? 'Shop deactivated successfully'
          : 'Shop activated successfully',
        variant: 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update shop status',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
      setSelectedShop(null)
    }
  }

  const handleViewDetails = async (shop: ShopData) => {
    setSelectedShop(shop)
    setShowDetailsDialog(true)
    setLoadingDetails(true)

    try {
      const response = await fetch(`/api/admin/shops/${shop.id}`)
      if (response.ok) {
        const data = await response.json()
        setShopDetails(data.shop)
      } else {
        throw new Error('Failed to fetch shop details')
      }
    } catch (error: any) {
      console.error('Failed to fetch shop details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load shop details',
        variant: 'destructive',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading shops...</p>
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
          <h1 className="text-3xl font-bold mb-2">Shop Management</h1>
          <p className="text-gray-600">Manage all shops, view performance metrics, and moderate shop accounts</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Shop name, city, state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <Label htmlFor="minRating">Minimum Rating</Label>
                <select
                  id="minRating"
                  value={minRatingFilter}
                  onChange={(e) => setMinRatingFilter(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border rounded-md"
                >
                  <option value="">All Ratings</option>
                  <option value="4.5">4.5+ ⭐</option>
                  <option value="4.0">4.0+ ⭐</option>
                  <option value="3.5">3.5+ ⭐</option>
                  <option value="3.0">3.0+ ⭐</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shops List */}
        <Card>
          <CardHeader>
            <CardTitle>Shops ({shops.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {shops.length === 0 ? (
              <div className="text-center py-12">
                <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No shops found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Shop</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Seller</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Location</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Rating</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Stats</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Revenue</th>
                      <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-sm text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shops.map((shop) => (
                      <tr key={shop.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{shop.name}</div>
                            <div className="text-xs text-gray-500">
                              {shop.stats.totalProducts} products
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium">{shop.seller.name || shop.seller.email}</div>
                            <div className="text-xs text-gray-500">{shop.seller.email}</div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {shop.city && shop.state ? `${shop.city}, ${shop.state}` : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">
                              {shop.rating > 0 ? shop.rating.toFixed(1) : 'N/A'}
                            </span>
                            {shop.totalReviews > 0 && (
                              <span className="text-xs text-gray-500">
                                ({shop.totalReviews})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3" />
                              {shop.stats.totalOrders} orders
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {shop.stats.totalReviews} reviews
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <div className="text-sm font-medium text-green-600">
                              {formatCurrency(shop.stats.revenue)}
                            </div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {shop.isActive ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(shop)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {shop.isActive && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeactivate(shop)}
                                disabled={processing === shop.id}
                              >
                                {processing === shop.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <PowerOff className="h-4 w-4 mr-1" />
                                )}
                                Deactivate
                              </Button>
                            )}
                            {!shop.isActive && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDeactivate(shop)}
                                disabled={processing === shop.id}
                              >
                                {processing === shop.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Power className="h-4 w-4 mr-1" />
                                )}
                                Activate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shop Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={(open) => {
          setShowDetailsDialog(open)
          if (!open) {
            setShopDetails(null)
            setSelectedShop(null)
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Shop Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about this shop
              </DialogDescription>
            </DialogHeader>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : shopDetails ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="font-semibold mb-3">Shop Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Shop Name</Label>
                      <p className="text-sm text-gray-700">{shopDetails.name}</p>
                    </div>
                    {shopDetails.description && (
                      <div>
                        <Label>Description</Label>
                        <p className="text-sm text-gray-700">{shopDetails.description}</p>
                      </div>
                    )}
                    <div>
                      <Label>Location</Label>
                      <p className="text-sm text-gray-700">
                        {shopDetails.address || 'N/A'}
                        {shopDetails.city && shopDetails.state && (
                          <> • {shopDetails.city}, {shopDetails.state}</>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <p className="text-sm">
                        {shopDetails.isActive ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-red-600 font-medium">Inactive</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <Label>Rating</Label>
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">
                          {shopDetails.rating > 0 ? shopDetails.rating.toFixed(1) : 'N/A'}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({shopDetails.totalReviews} reviews)
                        </span>
                      </div>
                    </div>
                    <div>
                      <Label>Created</Label>
                      <p className="text-sm text-gray-700">
                        {new Date(shopDetails.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seller Information */}
                {shopDetails.seller && (
                  <div>
                    <h3 className="font-semibold mb-3">Seller Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <p className="text-sm text-gray-700">{shopDetails.seller.name || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Email</Label>
                        <p className="text-sm text-gray-700">{shopDetails.seller.email}</p>
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <p className="text-sm text-gray-700">{shopDetails.seller.phoneNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Seller Status</Label>
                        <p className="text-sm text-gray-700">
                          {shopDetails.seller.sellerStatus || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Metrics */}
                <div>
                  <h3 className="font-semibold mb-3">Performance Metrics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{shopDetails.stats.totalProducts}</div>
                      <div className="text-xs text-gray-600">Products</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{shopDetails.stats.totalOrders}</div>
                      <div className="text-xs text-gray-600">Total Orders</div>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(shopDetails.stats.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-600">Total Revenue</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(shopDetails.stats.recentRevenue)}
                      </div>
                      <div className="text-xs text-gray-600">Recent (30d)</div>
                    </div>
                  </div>

                  {/* Order Statistics */}
                  {shopDetails.stats.orderStats && (
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      <div className="text-center p-2 bg-blue-50 rounded text-xs">
                        <div className="font-bold">{shopDetails.stats.orderStats.delivered}</div>
                        <div className="text-gray-600">Delivered</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded text-xs">
                        <div className="font-bold">{shopDetails.stats.orderStats.pending}</div>
                        <div className="text-gray-600">Pending</div>
                      </div>
                      <div className="text-center p-2 bg-red-50 rounded text-xs">
                        <div className="font-bold">{shopDetails.stats.orderStats.cancelled}</div>
                        <div className="text-gray-600">Cancelled</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded text-xs">
                        <div className="font-bold">{shopDetails.stats.orderStats.disputed}</div>
                        <div className="text-gray-600">Disputed</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded text-xs">
                        <div className="font-bold">{shopDetails.stats.orderStats.total}</div>
                        <div className="text-gray-600">Total</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Orders */}
                {shopDetails.orders && shopDetails.orders.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Orders ({shopDetails.stats.totalOrders} total)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shopDetails.orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">#{order.orderNumber}</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.buyer.name || order.buyer.email} • {new Date(order.createdAt).toLocaleDateString()} • {order.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reviews */}
                {shopDetails.reviews && shopDetails.reviews.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Reviews ({shopDetails.stats.totalReviews} total)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shopDetails.reviews.slice(0, 5).map((review: any) => (
                        <div key={review.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span>{review.buyer.name || review.buyer.email}</span>
                            <span>{review.rating}⭐</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{review.comment || 'No comment'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Disputes */}
                {shopDetails.disputes && shopDetails.disputes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-red-600">
                      Disputes ({shopDetails.disputes.length} total)
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shopDetails.disputes.slice(0, 5).map((dispute: any) => (
                        <div key={dispute.id} className="border border-red-200 rounded p-2 text-sm bg-red-50">
                          <div className="flex justify-between">
                            <span>Order #{dispute.order.orderNumber}</span>
                            <span className="text-red-600 font-medium">{dispute.status}</span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">{dispute.reason || 'No reason provided'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : selectedShop && (
              <div className="text-center py-4 text-gray-500">
                Failed to load shop details
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDetailsDialog(false)
                setShopDetails(null)
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deactivate Dialog */}
        <Dialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedShop?.isActive ? 'Deactivate Shop' : 'Activate Shop'}
              </DialogTitle>
              <DialogDescription>
                {selectedShop?.isActive
                  ? 'Are you sure you want to deactivate this shop? The shop will be hidden from the marketplace and the seller role will be deactivated.'
                  : 'Are you sure you want to activate this shop? The shop will be visible in the marketplace again.'}
              </DialogDescription>
            </DialogHeader>
            {selectedShop?.isActive && (
              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Reason for deactivation..."
                  className="mt-2"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeactivateDialog(false)}>
                Cancel
              </Button>
              <Button
                variant={selectedShop?.isActive ? 'destructive' : 'default'}
                onClick={confirmDeactivate}
                disabled={processing === selectedShop?.id}
              >
                {processing === selectedShop?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : selectedShop?.isActive ? (
                  'Deactivate'
                ) : (
                  'Activate'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
