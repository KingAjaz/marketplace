'use client'

/**
 * Admin Analytics Page
 * 
 * Platform-wide analytics and charts
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, DollarSign, ShoppingBag, Users, Store, ArrowLeft, Download } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[]
  ordersByMonth: { month: string; count: number }[]
  topShops: { name: string; revenue: number; orders: number }[]
  usersByMonth: { month: string; count: number }[]
  metrics: {
    totalRevenue: number
    totalOrders: number
    totalUsers: number
    totalSellers: number
    averageOrderValue: number
    platformFeeRate: number
  }
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!data) return
    
    const csvRows: string[] = []
    csvRows.push('Metric,Value')
    if (data.metrics) {
      csvRows.push(`Total Revenue,${data.metrics.totalRevenue}`)
      csvRows.push(`Total Orders,${data.metrics.totalOrders}`)
      csvRows.push(`Total Users,${data.metrics.totalUsers}`)
      csvRows.push(`Total Sellers,${data.metrics.totalSellers}`)
      csvRows.push(`Average Order Value,${data.metrics.averageOrderValue}`)
      csvRows.push(`Platform Fee Rate,${data.metrics.platformFeeRate}%`)
    }
    csvRows.push('')
    csvRows.push('Revenue by Month,Revenue')
    data.revenueByMonth.forEach(item => {
      csvRows.push(`${item.month},${item.revenue}`)
    })
    csvRows.push('')
    csvRows.push('Orders by Month,Count')
    data.ordersByMonth.forEach(item => {
      csvRows.push(`${item.month},${item.count}`)
    })
    csvRows.push('')
    csvRows.push('User Growth by Month,Count')
    data.usersByMonth.forEach(item => {
      csvRows.push(`${item.month},${item.count}`)
    })
    
    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-analytics-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
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

        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Platform Analytics</h1>
            <p className="text-gray-600">Track platform performance</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
            </select>
            <Button variant="outline" onClick={handleExportCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        {data?.metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Platform Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.metrics.totalRevenue)}</div>
                <p className="text-xs text-gray-500 mt-1">Platform fees collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.totalOrders}</div>
                <p className="text-xs text-gray-500 mt-1">All orders placed</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.totalUsers}</div>
                <p className="text-xs text-gray-500 mt-1">Registered users</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Sellers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.totalSellers}</div>
                <p className="text-xs text-gray-500 mt-1">Approved sellers</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.metrics.averageOrderValue)}</div>
                <p className="text-xs text-gray-500 mt-1">Per order</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Platform Fee Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.metrics.platformFeeRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-500 mt-1">Average commission</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Platform Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Platform Revenue (Last 6 Months)
              </CardTitle>
              <CardDescription>Monthly platform fees collected</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.revenueByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Platform Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Orders Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Orders Trend (Last 6 Months)
              </CardTitle>
              <CardDescription>Total orders placed per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.ordersByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Orders" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* User Growth */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Growth (Last 6 Months)
              </CardTitle>
              <CardDescription>New user registrations per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.usersByMonth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#10b981" name="New Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Shops */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Top Performing Shops
              </CardTitle>
              <CardDescription>Shops ranked by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.topShops || data.topShops.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No shop data available</p>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const shops = data.topShops
                    const maxShopRevenue = Math.max(...shops.map(shop => shop.revenue), 1)
                    
                    return shops.map((shop, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{shop.name}</p>
                          <p className="text-xs text-gray-500">{shop.orders} orders</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${Math.min((shop.revenue / maxShopRevenue) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="font-semibold text-sm w-24 text-right">
                            {formatCurrency(shop.revenue)}
                          </span>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
