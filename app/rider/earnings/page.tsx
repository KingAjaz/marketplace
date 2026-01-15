'use client'

/**
 * Rider Earnings Page
 * 
 * Displays rider earnings breakdown, delivery history, and statistics
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { 
  ArrowLeft, 
  TrendingUp, 
  Package, 
  DollarSign, 
  Calendar,
  Download,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface DeliveryEarning {
  id: string
  orderNumber: string
  deliveryFee: number
  deliveryAddress: string
  shopName: string
  deliveredAt: string | null
}

interface EarningsData {
  totalEarnings: number
  completedDeliveries: number
  averageEarnings: number
  deliveries: DeliveryEarning[]
  chartData: Array<{ date: string; earnings: number; count: number }>
  period: string
}

export default function RiderEarningsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/rider/earnings')
      return
    }

    if (status === 'authenticated' && session?.user) {
      // Check if user has rider role
      if (!session.user.roles?.includes('RIDER')) {
        router.push('/unauthorized')
        return
      }

      fetchEarnings()
    }
  }, [status, session, router, selectedPeriod])

  const fetchEarnings = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rider/earnings?period=${selectedPeriod}`)
      if (response.ok) {
        const data = await response.json()
        setEarningsData(data)
      } else {
        const errorData = await response.json()
        toast({
          title: 'Error',
          description: errorData.error || 'Failed to fetch earnings',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch earnings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!earningsData) return

    setExporting(true)
    try {
      // Create CSV content
      const headers = ['Order Number', 'Shop', 'Delivery Fee', 'Delivery Address', 'Delivered At']
      const rows = earningsData.deliveries.map((d) => [
        d.orderNumber,
        d.shopName,
        formatCurrency(d.deliveryFee),
        d.deliveryAddress,
        d.deliveredAt ? new Date(d.deliveredAt).toLocaleString() : 'N/A',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n')

      // Add summary
      const summary = [
        '',
        'Summary',
        `Total Earnings,${formatCurrency(earningsData.totalEarnings)}`,
        `Completed Deliveries,${earningsData.completedDeliveries}`,
        `Average Earnings,${formatCurrency(earningsData.averageEarnings)}`,
        `Period,${selectedPeriod === 'all' ? 'All Time' : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}`,
      ].join('\n')

      const fullCsv = csvContent + '\n' + summary

      // Download file
      const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `rider-earnings-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`
      )
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Success',
        description: 'Earnings report downloaded successfully',
        variant: 'default',
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export earnings report',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading earnings...</p>
        </div>
      </div>
    )
  }

  if (!earningsData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Unable to load earnings data</p>
            <Button onClick={fetchEarnings} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/rider/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Earnings</h1>
              <p className="text-gray-600">Track your delivery earnings and performance</p>
            </div>
            <Button
              onClick={handleExport}
              disabled={exporting || earningsData.deliveries.length === 0}
              variant="outline"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Period Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {['all', 'today', 'week', 'month'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
              >
                {period === 'all'
                  ? 'All Time'
                  : period.charAt(0).toUpperCase() + period.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(earningsData.totalEarnings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {selectedPeriod === 'all'
                  ? 'All time earnings'
                  : `Earnings for this ${selectedPeriod}`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Deliveries</CardTitle>
              <Package className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {earningsData.completedDeliveries}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Successful deliveries completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per Delivery</CardTitle>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(earningsData.averageEarnings)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Average earnings per delivery
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Earnings Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Earnings Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of all completed deliveries and earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {earningsData.deliveries.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No completed deliveries yet</p>
                <p className="text-sm text-gray-500">
                  Your earnings will appear here once you complete deliveries
                </p>
                <Link href="/rider/dashboard">
                  <Button className="mt-4">View Available Deliveries</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Order Number
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Shop
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-sm text-gray-600">
                          Delivery Address
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-gray-600">
                          Delivery Fee
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-sm text-gray-600">
                          Delivered At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {earningsData.deliveries.map((delivery) => (
                        <tr key={delivery.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-sm">
                              #{delivery.orderNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {delivery.shopName}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-md truncate">
                            {delivery.deliveryAddress}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-green-600">
                            {formatCurrency(delivery.deliveryFee)}
                          </td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">
                            {delivery.deliveredAt
                              ? new Date(delivery.deliveredAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={3} className="py-4 px-4 text-right">
                          Total:
                        </td>
                        <td className="py-4 px-4 text-right text-green-600">
                          {formatCurrency(earningsData.totalEarnings)}
                        </td>
                        <td className="py-4 px-4"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
