'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Package, ShoppingBag, TrendingUp, DollarSign, Clock, CheckCircle, Truck } from 'lucide-react'
import Link from 'next/link'
import { OrderStatus } from '@prisma/client'

interface DashboardStats {
  totalProducts: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: OrderStatus
  total: number
  buyer: {
    name: string | null
    email: string
  }
  createdAt: string
}

export default function SellerDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentOrders()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/seller/stats')
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentOrders = async () => {
    try {
      const response = await fetch('/api/seller/orders')
      if (response.ok) {
        const data = await response.json()
        // Get last 5 orders
        const orders = (data.orders || []).slice(0, 5).map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          buyer: order.buyer,
          createdAt: order.createdAt,
        }))
        setRecentOrders(orders)
      }
    } catch (error) {
      console.error('Failed to fetch recent orders:', error)
    } finally {
      setLoadingOrders(false)
    }
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case 'PREPARING':
      case 'OUT_FOR_DELIVERY':
        return <Truck className="h-3 w-3 text-blue-500" />
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your shop and orders</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats ? formatCurrency(stats.totalRevenue) : formatCurrency(0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendingOrders || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/seller/products">
                <Button className="w-full" variant="outline">
                  Manage Products
                </Button>
              </Link>
              <Link href="/seller/orders">
                <Button className="w-full" variant="outline">
                  View Orders
                </Button>
              </Link>
              <Link href="/seller/shop">
                <Button className="w-full" variant="outline">
                  Shop Settings
                </Button>
              </Link>
              <Link href="/seller/analytics">
                <Button className="w-full" variant="outline">
                  View Analytics
                </Button>
              </Link>
              <Link href="/seller/earnings">
                <Button className="w-full" variant="outline">
                  Earnings Report
                </Button>
              </Link>
              <Link href="/seller/inventory">
                <Button className="w-full" variant="outline">
                  Inventory Management
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest orders from your shop</CardDescription>
                </div>
                <Link href="/seller/orders">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-500">Loading orders...</p>
                </div>
              ) : recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No recent orders</p>
                  <Link href="/seller/products">
                    <Button variant="outline" size="sm" className="mt-3">
                      Start Adding Products
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/seller/orders/${order.id}`}
                      className="block p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(order.status)}
                            <span className="font-medium text-sm">#{order.orderNumber}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                order.status
                              )}`}
                            >
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {order.buyer.name || order.buyer.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(order.total)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {recentOrders.length === 5 && (
                    <Link href="/seller/orders">
                      <Button variant="outline" className="w-full mt-2" size="sm">
                        View All Orders
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
