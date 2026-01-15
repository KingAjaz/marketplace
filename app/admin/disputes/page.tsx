'use client'

/**
 * Admin Dispute Management Page
 * 
 * View and resolve disputes
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, XCircle, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Dispute {
  id: string
  orderId: string
  status: string
  reason: string
  buyerNotes: string | null
  sellerNotes: string | null
  adminNotes: string | null
  resolution: string | null
  createdAt: string
  resolvedAt: string | null
  order: {
    id: string
    orderNumber: string
    total: number
    shop: {
      name: string
    }
  }
  buyer: {
    name: string | null
    email: string
  }
  seller: {
    name: string | null
    email: string
  }
}

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [resolving, setResolving] = useState(false)
  const [resolutionData, setResolutionData] = useState({
    resolution: '',
    adminNotes: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchDisputes()
  }, [filter])

  const fetchDisputes = async () => {
    try {
      const params = filter !== 'ALL' ? `?status=${filter}` : ''
      const response = await fetch(`/api/admin/disputes${params}`)
      if (response.ok) {
        const data = await response.json()
        setDisputes(data.disputes || [])
      }
    } catch (error) {
      console.error('Failed to fetch disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedDispute) return

    setResolving(true)
    try {
      const response = await fetch(`/api/admin/disputes/${selectedDispute.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolutionData),
      })

      if (response.ok) {
        toast({
          title: 'Dispute Resolved',
          description: 'Dispute resolved successfully',
          variant: 'success',
        })
        setSelectedDispute(null)
        setResolutionData({ resolution: '', adminNotes: '' })
        fetchDisputes()
      } else {
        const data = await response.json()
        toast({
          title: 'Resolution Failed',
          description: data.error || 'Failed to resolve dispute',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to resolve dispute:', error)
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve dispute',
        variant: 'destructive',
      })
    } finally {
      setResolving(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CLOSED':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'IN_REVIEW':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return 'bg-green-100 text-green-800'
      case 'CLOSED':
        return 'bg-gray-100 text-gray-800'
      case 'IN_REVIEW':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading disputes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dispute Management</h1>
          <p className="text-gray-600">Review and resolve customer disputes</p>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <Button
            variant={filter === 'ALL' ? 'default' : 'outline'}
            onClick={() => setFilter('ALL')}
            size="sm"
          >
            All ({disputes.length})
          </Button>
          <Button
            variant={filter === 'OPEN' ? 'default' : 'outline'}
            onClick={() => setFilter('OPEN')}
            size="sm"
          >
            Open ({disputes.filter(d => d.status === 'OPEN').length})
          </Button>
          <Button
            variant={filter === 'IN_REVIEW' ? 'default' : 'outline'}
            onClick={() => setFilter('IN_REVIEW')}
            size="sm"
          >
            In Review ({disputes.filter(d => d.status === 'IN_REVIEW').length})
          </Button>
          <Button
            variant={filter === 'RESOLVED' ? 'default' : 'outline'}
            onClick={() => setFilter('RESOLVED')}
            size="sm"
          >
            Resolved ({disputes.filter(d => d.status === 'RESOLVED').length})
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {disputes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No disputes found</p>
                </CardContent>
              </Card>
            ) : (
              disputes.map((dispute) => (
                <Card
                  key={dispute.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedDispute?.id === dispute.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedDispute(dispute)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Order #{dispute.order.orderNumber}</CardTitle>
                        <CardDescription className="mt-1">
                          {dispute.buyer.name || dispute.buyer.email} vs {dispute.seller.name || dispute.seller.email}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(dispute.status)}
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            dispute.status
                          )}`}
                        >
                          {dispute.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Reason:</p>
                        <p className="text-sm text-gray-600">{dispute.reason}</p>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-sm text-gray-600">
                          Amount: <span className="font-semibold">{formatCurrency(dispute.order.total)}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(dispute.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {selectedDispute && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Dispute Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Order Number:</p>
                    <p className="text-sm text-gray-600">#{selectedDispute.order.orderNumber}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-1">Reason:</p>
                    <p className="text-sm text-gray-600">{selectedDispute.reason}</p>
                  </div>

                  {selectedDispute.buyerNotes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Buyer Notes:</p>
                      <p className="text-sm text-gray-600">{selectedDispute.buyerNotes}</p>
                    </div>
                  )}

                  {selectedDispute.sellerNotes && (
                    <div>
                      <p className="text-sm font-medium mb-1">Seller Notes:</p>
                      <p className="text-sm text-gray-600">{selectedDispute.sellerNotes}</p>
                    </div>
                  )}

                  {selectedDispute.status !== 'RESOLVED' && selectedDispute.status !== 'CLOSED' && (
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <Label htmlFor="resolution">Resolution *</Label>
                        <select
                          id="resolution"
                          value={resolutionData.resolution}
                          onChange={(e) => setResolutionData({ ...resolutionData, resolution: e.target.value })}
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select resolution</option>
                          <option value="BUYER_WINS">Refund Buyer</option>
                          <option value="SELLER_WINS">Release to Seller</option>
                          <option value="PARTIAL">Partial Refund</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="adminNotes">Admin Notes</Label>
                        <textarea
                          id="adminNotes"
                          value={resolutionData.adminNotes}
                          onChange={(e) => setResolutionData({ ...resolutionData, adminNotes: e.target.value })}
                          rows={4}
                          placeholder="Add notes about the resolution..."
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <Button
                        onClick={handleResolve}
                        disabled={resolving || !resolutionData.resolution}
                        className="w-full"
                      >
                        {resolving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Resolving...
                          </>
                        ) : (
                          'Resolve Dispute'
                        )}
                      </Button>
                    </div>
                  )}

                  {selectedDispute.status === 'RESOLVED' && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-1">Resolution:</p>
                      <p className="text-sm text-gray-600">
                        {selectedDispute.resolution?.replace('_', ' ')}
                      </p>
                      {selectedDispute.resolvedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Resolved on {new Date(selectedDispute.resolvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
