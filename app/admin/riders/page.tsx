'use client'

/**
 * Admin Rider Management Page
 * 
 * Allows admins to view, approve, and manage rider applications.
 * Shows pending applications and all riders with statistics.
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Bike, CheckCircle, XCircle, Clock, User, Package, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface RiderApplication {
  id: string
  userId: string
  name: string | null
  email: string
  phoneNumber: string | null
  riderStatus: string | null
  isActive: boolean
  rejectionReason: string | null
  createdAt: string
  updatedAt: string
  userCreatedAt: string
  stats: {
    activeDeliveries: number
    completedDeliveries: number
    failedDeliveries: number
    totalDeliveries: number
  }
}

interface RiderCounts {
  pending: number
  approved: number
  suspended: number
  rejected: number
  total: number
}

type ViewMode = 'pending' | 'all'

export default function AdminRidersPage() {
  const [riders, setRiders] = useState<RiderApplication[]>([])
  const [counts, setCounts] = useState<RiderCounts>({
    pending: 0,
    approved: 0,
    suspended: 0,
    rejected: 0,
    total: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState<{ [key: string]: string }>({})
  const [showRejectForm, setShowRejectForm] = useState<{ [key: string]: boolean }>({})
  const [viewMode, setViewMode] = useState<ViewMode>('pending')
  const [statusFilter, setStatusFilter] = useState<string>('PENDING')
  const { toast } = useToast()

  useEffect(() => {
    fetchRiders()
    // Fetch counts separately for pending view
    if (viewMode === 'pending') {
      fetchCounts()
    }
  }, [viewMode, statusFilter])

  const fetchCounts = async () => {
    try {
      const response = await fetch('/api/admin/riders')
      if (response.ok) {
        const data = await response.json()
        setCounts(data.counts || {
          pending: 0,
          approved: 0,
          suspended: 0,
          rejected: 0,
          total: 0,
        })
      }
    } catch (err) {
      console.error('Failed to fetch counts:', err)
    }
  }

  const fetchRiders = async () => {
    try {
      setLoading(true)
      const url =
        viewMode === 'pending'
          ? '/api/admin/riders/pending'
          : `/api/admin/riders?status=${statusFilter === 'ALL' ? '' : statusFilter}`

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch riders')
      }

      const data = await response.json()

      if (viewMode === 'pending') {
        // Transform pending API response to match our interface
        const transformedRiders = data.riders.map((rider: any) => ({
          id: rider.id,
          userId: rider.userId,
          name: rider.user.name,
          email: rider.user.email,
          phoneNumber: rider.user.phoneNumber,
          riderStatus: rider.riderStatus,
          isActive: rider.isActive,
          rejectionReason: rider.rejectionReason,
          createdAt: rider.createdAt,
          updatedAt: rider.updatedAt,
          userCreatedAt: rider.user.createdAt,
          stats: {
            activeDeliveries: 0,
            completedDeliveries: 0,
            failedDeliveries: 0,
            totalDeliveries: 0,
          },
        }))
        setRiders(transformedRiders)
      } else {
        // All riders view with counts
        setRiders(data.riders)
        setCounts(data.counts || {
          pending: 0,
          approved: 0,
          suspended: 0,
          rejected: 0,
          total: 0,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load riders')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    setProcessing(userId)
    try {
      const response = await fetch(`/api/admin/riders/${userId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to approve rider')
      }

      await fetchRiders()
      toast({
        title: 'Rider Approved',
        description: 'Rider application approved successfully',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Approval Failed',
        description: err.message || 'Failed to approve rider',
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

    setProcessing(userId)
    try {
      const response = await fetch(`/api/admin/riders/${userId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to reject rider')
      }

      setRejectReason({ ...rejectReason, [userId]: '' })
      setShowRejectForm({ ...showRejectForm, [userId]: false })
      await fetchRiders()
      toast({
        title: 'Rider Rejected',
        description: 'Rider application rejected',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Rejection Failed',
        description: err.message || 'Failed to reject rider',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
    }
  }

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'SUSPENDED':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  if (loading && riders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading riders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rider Management</h1>
            <p className="text-gray-600">Review and manage rider applications</p>
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

        {/* View Mode Tabs */}
        <div className="mb-6 flex gap-4 border-b">
          <button
            onClick={() => {
              setViewMode('pending')
              setStatusFilter('PENDING')
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              viewMode === 'pending'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Applications ({counts.pending || 0})
          </button>
          <button
            onClick={() => {
              setViewMode('all')
              setStatusFilter('ALL')
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              viewMode === 'all'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Riders ({counts.total || 0})
          </button>
        </div>

        {/* Status Filters (for All Riders view) */}
        {viewMode === 'all' && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({counts.total || 0})
            </button>
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'PENDING'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Pending ({counts.pending || 0})
            </button>
            <button
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'APPROVED'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Approved ({counts.approved || 0})
            </button>
            <button
              onClick={() => setStatusFilter('SUSPENDED')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'SUSPENDED'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Suspended ({counts.suspended || 0})
            </button>
            <button
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                statusFilter === 'REJECTED'
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Rejected ({counts.rejected || 0})
            </button>
          </div>
        )}

        {riders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {viewMode === 'pending'
                  ? 'No pending rider applications'
                  : `No riders found${statusFilter !== 'ALL' ? ` with status ${statusFilter}` : ''}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {riders.map((rider) => (
              <Card key={rider.id} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Bike className="h-6 w-6 text-primary" />
                      <div>
                        <CardTitle className="text-xl">{rider.name || 'No Name'}</CardTitle>
                        <CardDescription>
                          Application {viewMode === 'pending' ? 'submitted' : 'updated'}{' '}
                          {new Date(
                            viewMode === 'pending' ? rider.createdAt : rider.updatedAt
                          ).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          rider.riderStatus
                        )}`}
                      >
                        {rider.riderStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Rider Information */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Rider Information
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium">Name:</span> {rider.name || 'Not provided'}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {rider.email}
                        </div>
                        <div>
                          <span className="font-medium">Phone:</span>{' '}
                          {rider.phoneNumber || 'Not provided'}
                        </div>
                        <div>
                          <span className="font-medium">Member since:</span>{' '}
                          {new Date(rider.userCreatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Statistics (for approved riders) */}
                    {viewMode === 'all' && rider.riderStatus === 'APPROVED' && (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Delivery Statistics
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-blue-900">
                              {rider.stats.activeDeliveries}
                            </div>
                            <div className="text-xs text-blue-700">Active</div>
                          </div>
                          <div className="bg-green-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-green-900">
                              {rider.stats.completedDeliveries}
                            </div>
                            <div className="text-xs text-green-700">Completed</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-red-900">
                              {rider.stats.failedDeliveries}
                            </div>
                            <div className="text-xs text-red-700">Failed</div>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-2xl font-bold text-gray-900">
                              {rider.stats.totalDeliveries}
                            </div>
                            <div className="text-xs text-gray-700">Total</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rejection Reason (for rejected riders) */}
                    {rider.rejectionReason && (
                      <div className="md:col-span-2 space-y-2">
                        <h3 className="font-semibold text-sm text-red-900">Rejection Reason</h3>
                        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-800">
                          {rider.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reject Form */}
                  {showRejectForm[rider.userId] && (
                    <div className="mt-6 pt-6 border-t bg-red-50 p-4 rounded">
                      <Label htmlFor={`reject-${rider.userId}`} className="text-red-900 font-semibold">
                        Rejection Reason *
                      </Label>
                      <textarea
                        id={`reject-${rider.userId}`}
                        value={rejectReason[rider.userId] || ''}
                        onChange={(e) =>
                          setRejectReason({ ...rejectReason, [rider.userId]: e.target.value })
                        }
                        rows={3}
                        className="mt-2 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        placeholder="Provide a reason for rejection..."
                      />
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(rider.userId)}
                          disabled={processing === rider.userId}
                        >
                          {processing === rider.userId ? 'Rejecting...' : 'Confirm Rejection'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setShowRejectForm({ ...showRejectForm, [rider.userId]: false })
                            setRejectReason({ ...rejectReason, [rider.userId]: '' })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons (only for pending riders) */}
                  {rider.riderStatus === 'PENDING' && !showRejectForm[rider.userId] && (
                    <div className="mt-6 pt-6 border-t flex gap-3">
                      <Button
                        onClick={() => handleApprove(rider.userId)}
                        disabled={processing === rider.userId}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing === rider.userId ? 'Approving...' : 'Approve Rider'}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowRejectForm({ ...showRejectForm, [rider.userId]: true })}
                        disabled={processing === rider.userId}
                        className="flex-1"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Application
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
