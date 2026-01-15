'use client'

/**
 * Admin Seller Approval Page
 * 
 * Allows admins to view and approve/reject pending seller applications.
 * Shows all application details including shop information.
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, CheckCircle, XCircle, Clock, User, MapPin, Building } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface SellerApplication {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    email: string
    phoneNumber: string | null
  }
  shop: {
    id: string
    name: string
    description: string | null
    address: string | null
    city: string | null
    state: string | null
    createdAt: string
  } | null
  sellerStatus: string
  kycSubmitted: boolean
  createdAt: string
}

export default function AdminSellersPage() {
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({})
  const [showRejectForm, setShowRejectForm] = useState<{ [key: string]: boolean }>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/admin/sellers/pending')
      if (!response.ok) {
        throw new Error('Failed to fetch applications')
      }
      const data = await response.json()
      setApplications(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    if (!confirm('Are you sure you want to approve this seller?')) {
      return
    }

    setProcessing(userId)
    try {
      const response = await fetch(`/api/admin/sellers/${userId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve seller')
      }

      // Refresh applications list
      await fetchApplications()
      toast({
        title: 'Seller Approved',
        description: 'Seller application approved successfully',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Approval Failed',
        description: err.message || 'Failed to approve seller',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (userId: string) => {
    const reason = rejectReason[userId]?.trim()
    if (!reason) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      })
      return
    }

    if (!confirm('Are you sure you want to reject this seller application?')) {
      return
    }

    setProcessing(userId)
    try {
      const response = await fetch(`/api/admin/sellers/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject seller')
      }

      // Reset form and refresh
      setRejectReason({ ...rejectReason, [userId]: '' })
      setShowRejectForm({ ...showRejectForm, [userId]: false })
      await fetchApplications()
      toast({
        title: 'Seller Rejected',
        description: 'Seller application rejected',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Rejection Failed',
        description: err.message || 'Failed to reject seller',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const parseApplicationDetails = (description: string | null) => {
    if (!description) return { businessType: null, registrationNumber: null }
    
    const lines = description.split('\n')
    let businessType = null
    let registrationNumber = null

    for (const line of lines) {
      if (line.startsWith('Business Type:')) {
        businessType = line.replace('Business Type:', '').trim()
      }
      if (line.startsWith('Registration Number:')) {
        registrationNumber = line.replace('Registration Number:', '').trim()
      }
    }

    return { businessType, registrationNumber }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seller Applications</h1>
            <p className="text-gray-600">Review and approve pending seller applications</p>
          </div>
          <Link href="/admin/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {applications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No pending seller applications</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => {
              const { businessType, registrationNumber } = parseApplicationDetails(app.shop?.description || null)
              
              return (
                <Card key={app.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Store className="h-6 w-6 text-primary" />
                        <div>
                          <CardTitle className="text-xl">{app.shop?.name || 'No Shop Name'}</CardTitle>
                          <CardDescription>
                            Application submitted {new Date(app.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                          Pending Review
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Seller Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Seller Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Name:</span>{' '}
                            {app.user.name || 'Not provided'}
                          </div>
                          <div>
                            <span className="font-medium">Email:</span>{' '}
                            {app.user.email}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span>{' '}
                            {app.user.phoneNumber || 'Not provided'}
                          </div>
                        </div>
                      </div>

                      {/* Shop Information */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Shop Information
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="font-medium">Shop Name:</span>{' '}
                            {app.shop?.name || 'Not provided'}
                          </div>
                          {app.shop?.address && (
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <div>{app.shop.address}</div>
                                {app.shop.city && app.shop.state && (
                                  <div className="text-gray-600">
                                    {app.shop.city}, {app.shop.state}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {businessType && (
                            <div>
                              <span className="font-medium">Business Type:</span>{' '}
                              {businessType}
                            </div>
                          )}
                          {registrationNumber && (
                            <div>
                              <span className="font-medium">Registration Number:</span>{' '}
                              {registrationNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Business Description */}
                    {app.shop?.description && (
                      <div className="mt-6 pt-6 border-t">
                        <h3 className="font-semibold text-lg mb-2">Business Description</h3>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {app.shop.description.split('--- Application Details ---')[0].trim()}
                        </p>
                      </div>
                    )}

                    {/* Reject Form */}
                    {showRejectForm[app.userId] && (
                      <div className="mt-6 pt-6 border-t bg-red-50 p-4 rounded">
                        <Label htmlFor={`reject-${app.userId}`} className="text-red-900 font-semibold">
                          Rejection Reason *
                        </Label>
                        <textarea
                          id={`reject-${app.userId}`}
                          value={rejectReason[app.userId] || ''}
                          onChange={(e) =>
                            setRejectReason({ ...rejectReason, [app.userId]: e.target.value })
                          }
                          rows={3}
                          className="mt-2 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          placeholder="Provide a reason for rejection..."
                        />
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(app.userId)}
                            disabled={processing === app.userId}
                          >
                            {processing === app.userId ? 'Rejecting...' : 'Confirm Rejection'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowRejectForm({ ...showRejectForm, [app.userId]: false })
                              setRejectReason({ ...rejectReason, [app.userId]: '' })
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!showRejectForm[app.userId] && (
                      <div className="mt-6 pt-6 border-t flex gap-3">
                        <Button
                          onClick={() => handleApprove(app.userId)}
                          disabled={processing === app.userId}
                          className="flex-1"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {processing === app.userId ? 'Approving...' : 'Approve Seller'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowRejectForm({ ...showRejectForm, [app.userId]: true })}
                          disabled={processing === app.userId}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Application
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
