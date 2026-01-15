'use client'

/**
 * Seller Earnings Report Page
 * 
 * Detailed breakdown of seller earnings and payments
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, Download, ArrowLeft, TrendingUp, Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface EarningsData {
  summary: {
    totalRevenue: number
    totalPlatformFees: number
    netEarnings: number
    totalOrders: number
    averageOrderValue: number
    periodStart: string
    periodEnd: string
  }
  breakdown: {
    date: string
    revenue: number
    platformFee: number
    netEarnings: number
    orderCount: number
    orders: {
      id: string
      orderNumber: string
      total: number
      platformFee: number
      netAmount: number
      status: string
      createdAt: string
      releasedAt: string | null
    }[]
  }[]
}

export default function SellerEarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [breakdownBy, setBreakdownBy] = useState<'day' | 'week' | 'month'>('day')
  const { toast } = useToast()

  useEffect(() => {
    fetchEarnings()
  }, [period, breakdownBy])

  const fetchEarnings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/seller/earnings?period=${period}&breakdownBy=${breakdownBy}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        toast({
          title: 'Failed to Load Earnings',
          description: 'Failed to fetch earnings data',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
      toast({
        title: 'Failed to Load Earnings',
        description: 'Failed to fetch earnings data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!data) return

    const csvRows: string[] = []
    csvRows.push('Seller Earnings Report')
    csvRows.push(`Period: ${new Date(data.summary.periodStart).toLocaleDateString()} - ${new Date(data.summary.periodEnd).toLocaleDateString()}`)
    csvRows.push('')
    csvRows.push('Summary')
    csvRows.push(`Total Revenue,${data.summary.totalRevenue}`)
    csvRows.push(`Total Platform Fees,${data.summary.totalPlatformFees}`)
    csvRows.push(`Net Earnings,${data.summary.netEarnings}`)
    csvRows.push(`Total Orders,${data.summary.totalOrders}`)
    csvRows.push(`Average Order Value,${data.summary.averageOrderValue}`)
    csvRows.push('')
    csvRows.push('Breakdown')
    csvRows.push('Date,Revenue,Platform Fee,Net Earnings,Order Count')
    data.breakdown.forEach(item => {
      csvRows.push(`${item.date},${item.revenue},${item.platformFee},${item.netEarnings},${item.orderCount}`)
    })
    csvRows.push('')
    csvRows.push('Order Details')
    csvRows.push('Order Number,Date,Total,Platform Fee,Net Amount,Status,Released At')
    data.breakdown.forEach(item => {
      item.orders.forEach(order => {
        csvRows.push(`${order.orderNumber},${order.createdAt},${order.total},${order.platformFee},${order.netAmount},${order.status},${order.releasedAt || ''}`)
      })
    })

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `earnings-report-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)

    toast({
      title: 'Export Successful',
      description: 'Earnings report exported to CSV',
      variant: 'success',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading earnings report...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No Earnings Data</h2>
            <p className="text-gray-600 mb-4">No earnings data available for the selected period</p>
            <Link href="/seller/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-6">
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Earnings Report</h1>
            <p className="text-gray-600">
              {new Date(data.summary.periodStart).toLocaleDateString()} - {new Date(data.summary.periodEnd).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={breakdownBy}
              onChange={(e) => setBreakdownBy(e.target.value as 'day' | 'week' | 'month')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="day">By Day</option>
              <option value="week">By Week</option>
              <option value="month">By Month</option>
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="180">Last 6 months</option>
              <option value="365">Last year</option>
            </select>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div>
              <p className="text-xs text-gray-500 mt-1">Before platform fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Platform Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.summary.totalPlatformFees)}</div>
              <p className="text-xs text-gray-500 mt-1">Total fees deducted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Net Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.netEarnings)}</div>
              <p className="text-xs text-gray-500 mt-1">After platform fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary.totalOrders}</div>
              <p className="text-xs text-gray-500 mt-1">
                Avg: {formatCurrency(data.summary.averageOrderValue)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Earnings Breakdown
            </CardTitle>
            <CardDescription>Detailed breakdown by {breakdownBy}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Date</th>
                    <th className="text-right py-3 px-4 font-semibold">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold">Platform Fee</th>
                    <th className="text-right py-3 px-4 font-semibold">Net Earnings</th>
                    <th className="text-right py-3 px-4 font-semibold">Orders</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdown.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{item.date}</td>
                      <td className="text-right py-3 px-4 font-medium">{formatCurrency(item.revenue)}</td>
                      <td className="text-right py-3 px-4 text-orange-600">{formatCurrency(item.platformFee)}</td>
                      <td className="text-right py-3 px-4 font-bold text-green-600">{formatCurrency(item.netEarnings)}</td>
                      <td className="text-right py-3 px-4">{item.orderCount}</td>
                      <td className="text-right py-3 px-4">
                        <Link href={`/seller/earnings/${item.date}`}>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-2" />
                            View Orders
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="py-4 px-4">Total</td>
                    <td className="text-right py-4 px-4">{formatCurrency(data.summary.totalRevenue)}</td>
                    <td className="text-right py-4 px-4 text-orange-600">{formatCurrency(data.summary.totalPlatformFees)}</td>
                    <td className="text-right py-4 px-4 text-green-600">{formatCurrency(data.summary.netEarnings)}</td>
                    <td className="text-right py-4 px-4">{data.summary.totalOrders}</td>
                    <td className="py-4 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
