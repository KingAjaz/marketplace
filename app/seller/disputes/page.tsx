'use client'

/**
 * Seller Disputes Page
 * 
 * View and respond to disputes
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { AlertTriangle, CheckCircle, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Dispute {
  id: string
  orderId: string
  status: string
  reason: string
  buyerNotes: string | null
  sellerNotes: string | null
  resolution: string | null
  createdAt: string
  order: {
    id: string
    orderNumber: string
    total: number
  }
  buyer: {
    name: string | null
    email: string
  }
}

export default function SellerDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [sellerNotes, setSellerNotes] = useState('')
  const [updating, setUpdating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchDisputes()
  }, [])

  const fetchDisputes = async () => {
    try {
      const response = await fetch('/api/disputes?role=seller')
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

  const handleUpdateNotes = async () => {
    if (!selectedDispute) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/disputes/${selectedDispute.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerNotes }),
      })

      if (response.ok) {
        toast({
          title: 'Response Submitted',
          description: 'Response submitted successfully',
          variant: 'success',
        })
        setSellerNotes('')
        fetchDisputes()
      } else {
        const data = await response.json()
        toast({
          title: 'Submission Failed',
          description: data.error || 'Failed to submit response',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to update dispute:', error)
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit response',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
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
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Disputes</h1>
          <p className="text-gray-600">Respond to customer disputes</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            {disputes.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
                  onClick={() => {
                    setSelectedDispute(dispute)
                    setSellerNotes(dispute.sellerNotes || '')
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>Order #{dispute.order.orderNumber}</CardTitle>
                        <CardDescription className="mt-1">
                          {dispute.buyer.name || dispute.buyer.email}
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
                      {dispute.buyerNotes && (
                        <div>
                          <p className="text-sm font-medium">Buyer Notes:</p>
                          <p className="text-sm text-gray-600">{dispute.buyerNotes}</p>
                        </div>
                      )}
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
                  <CardTitle>Respond to Dispute</CardTitle>
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

                  {selectedDispute.status !== 'RESOLVED' && (
                    <div className="pt-4 border-t space-y-4">
                      <div>
                        <Label htmlFor="sellerNotes">Your Response *</Label>
                        <textarea
                          id="sellerNotes"
                          value={sellerNotes}
                          onChange={(e) => setSellerNotes(e.target.value)}
                          rows={6}
                          placeholder="Provide your side of the story..."
                          className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <Button
                        onClick={handleUpdateNotes}
                        disabled={updating || !sellerNotes.trim()}
                        className="w-full"
                      >
                        {updating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Response'
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
