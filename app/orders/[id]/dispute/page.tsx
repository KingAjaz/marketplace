'use client'

/**
 * Create Dispute Page
 * 
 * Allows buyers to create a dispute for an order
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

export default function CreateDisputePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const orderId = params.id as string
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<any>(null)
  const [formData, setFormData] = useState({
    reason: '',
    buyerNotes: '',
  })
  const { toast } = useToast()

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin')
      return
    }
    fetchOrder()
  }, [orderId, session, router])

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const data = await response.json()
        setOrder(data.order)
      }
    } catch (error) {
      console.error('Failed to fetch order:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          reason: formData.reason,
          buyerNotes: formData.buyerNotes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create dispute')
      }

      toast({
        title: 'Dispute Created',
        description: 'Dispute created successfully. Admin will review your case.',
        variant: 'success',
      })
      router.push(`/orders/${orderId}`)
    } catch (error: any) {
      toast({
        title: 'Creation Failed',
        description: error.message || 'Failed to create dispute',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Link href={`/orders/${orderId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <CardTitle className="text-2xl">Create Dispute</CardTitle>
                <CardDescription>
                  Order #{order.orderNumber} • {order.shop.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="reason">Reason for Dispute *</Label>
                <select
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  required
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a reason</option>
                  <option value="Item not received">Item not received</option>
                  <option value="Item damaged">Item damaged</option>
                  <option value="Wrong item received">Wrong item received</option>
                  <option value="Item quality issues">Item quality issues</option>
                  <option value="Delivery delay">Delivery delay</option>
                  <option value="Payment issue">Payment issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <Label htmlFor="buyerNotes">Additional Details *</Label>
                <textarea
                  id="buyerNotes"
                  value={formData.buyerNotes}
                  onChange={(e) => setFormData({ ...formData, buyerNotes: e.target.value })}
                  required
                  rows={6}
                  placeholder="Please provide detailed information about your dispute..."
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> Creating a dispute will freeze the payment in escrow.
                  Our admin team will review your case and make a decision. Please provide as much
                  detail as possible to help us resolve this quickly.
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Dispute'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
