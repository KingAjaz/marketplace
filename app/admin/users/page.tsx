'use client'

/**
 * Admin Users Management Page
 * 
 * Allows admins to view all users, filter by role/status, view user details,
 * and suspend/unsuspend users
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
  Users,
  Search,
  Filter,
  Shield,
  ShieldOff,
  User,
  ShoppingBag,
  MessageSquare,
  AlertCircle,
  Calendar,
  ArrowLeft,
  Loader2,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'

interface UserRole {
  role: string
  isActive: boolean
  sellerStatus?: string | null
  riderStatus?: string | null
  createdAt: string
}

interface UserData {
  id: string
  email: string
  name: string | null
  phoneNumber: string | null
  emailVerified: string | null
  phoneVerified: boolean
  image: string | null
  createdAt: string
  roles: UserRole[]
  shop: {
    id: string
    name: string
    isActive: boolean
  } | null
  stats: {
    totalOrders: number
    totalReviews: number
    totalDisputes: number
  }
  isSuspended: boolean
  isActive: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [userDetails, setUserDetails] = useState<any | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [roleFilter, statusFilter, searchQuery, startDate, endDate])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchQuery) params.append('search', searchQuery)
      if (startDate) params.append('startDate', startDate)
      if (endDate) params.append('endDate', endDate)

      const response = await fetch(`/api/admin/users?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error: any) {
      console.error('Failed to fetch users:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load users',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (user: UserData) => {
    setSelectedUser(user)
    setShowSuspendDialog(true)
  }

  const confirmSuspend = async () => {
    if (!selectedUser) return

    setProcessing(selectedUser.id)
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: selectedUser.isSuspended ? 'unsuspend' : 'suspend',
          reason: suspendReason || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update user status')
      }

      setShowSuspendDialog(false)
      setSuspendReason('')
      await fetchUsers()
      toast({
        title: 'Success',
        description: selectedUser.isSuspended
          ? 'User unsuspended successfully'
          : 'User suspended successfully',
        variant: 'default',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user status',
        variant: 'destructive',
      })
    } finally {
      setProcessing(null)
      setSelectedUser(null)
    }
  }

  const handleViewDetails = async (user: UserData) => {
    setSelectedUser(user)
    setShowDetailsDialog(true)
    setLoadingDetails(true)
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setUserDetails(data.user)
      } else {
        throw new Error('Failed to fetch user details')
      }
    } catch (error: any) {
      console.error('Failed to fetch user details:', error)
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      })
    } finally {
      setLoadingDetails(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'SELLER':
        return 'bg-blue-100 text-blue-800'
      case 'RIDER':
        return 'bg-green-100 text-green-800'
      case 'BUYER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-4 sm:mb-6">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">User Management</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage all platform users, view details, and moderate accounts</p>
        </div>

        {/* Filters */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search" className="text-sm">Search</Label>
                <div className="relative mt-1 sm:mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Name, email, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="role" className="text-sm">Role</Label>
                <select
                  id="role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full mt-1 sm:mt-2 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="all">All Roles</option>
                  <option value="BUYER">Buyer</option>
                  <option value="SELLER">Seller</option>
                  <option value="RIDER">Rider</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <Label htmlFor="status" className="text-sm">Status</Label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full mt-1 sm:mt-2 px-3 py-2 text-sm border rounded-md"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              <div>
                <Label htmlFor="dateRange" className="text-sm">Date Range (Optional)</Label>
                <div className="grid grid-cols-2 gap-2 mt-1 sm:mt-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start date"
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End date"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">User</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">Roles</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">Stats</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">Registered</th>
                      <th className="text-left py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">Status</th>
                      <th className="text-right py-3 px-2 sm:px-4 font-medium text-xs sm:text-sm text-gray-600 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <div className="font-medium">{user.name || user.email}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.phoneNumber && (
                              <div className="text-xs text-gray-400">{user.phoneNumber}</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((role, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  role.isActive
                                    ? getRoleBadgeColor(role.role)
                                    : 'bg-gray-100 text-gray-400 line-through'
                                }`}
                              >
                                {role.role}
                                {role.sellerStatus && role.sellerStatus !== 'APPROVED' && (
                                  <span className="ml-1">({role.sellerStatus})</span>
                                )}
                                {role.riderStatus && role.riderStatus !== 'APPROVED' && (
                                  <span className="ml-1">({role.riderStatus})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3" />
                              {user.stats.totalOrders} orders
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {user.stats.totalReviews} reviews
                            </div>
                            {user.stats.totalDisputes > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-3 w-3" />
                                {user.stats.totalDisputes} disputes
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          {user.isSuspended ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Suspended
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(user)}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            {!user.isSuspended && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleSuspend(user)}
                                disabled={processing === user.id}
                                className="text-xs"
                              >
                                {processing === user.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <ShieldOff className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                )}
                                <span className="hidden sm:inline">Suspend</span>
                              </Button>
                            )}
                            {user.isSuspended && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSuspend(user)}
                                disabled={processing === user.id}
                                className="text-xs"
                              >
                                {processing === user.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                )}
                                <span className="hidden sm:inline">Unsuspend</span>
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

        {/* User Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={(open) => {
          setShowDetailsDialog(open)
          if (!open) {
            setUserDetails(null)
            setSelectedUser(null)
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Comprehensive information about this user
              </DialogDescription>
            </DialogHeader>
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : userDetails ? (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="font-semibold mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p className="text-sm text-gray-700">{userDetails.name || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <p className="text-sm text-gray-700">{userDetails.email}</p>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <p className="text-sm text-gray-700">{userDetails.phoneNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label>Verification</Label>
                      <p className="text-sm">
                        Email: {userDetails.emailVerified ? '✓ Verified' : '✗ Not verified'} | 
                        Phone: {userDetails.phoneVerified ? '✓ Verified' : '✗ Not verified'}
                      </p>
                    </div>
                    <div>
                      <Label>Registered</Label>
                      <p className="text-sm text-gray-700">
                        {new Date(userDetails.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {userDetails.shop && (
                      <div>
                        <Label>Shop</Label>
                        <p className="text-sm text-gray-700">
                          {userDetails.shop.name} ({userDetails.shop.isActive ? 'Active' : 'Inactive'})
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Roles */}
                <div>
                  <h3 className="font-semibold mb-3">Roles & Permissions</h3>
                  <div className="flex flex-wrap gap-2">
                    {userDetails.roles.map((role: any, idx: number) => (
                      <span
                        key={idx}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          role.isActive
                            ? getRoleBadgeColor(role.role)
                            : 'bg-gray-100 text-gray-400 line-through'
                        }`}
                      >
                        {role.role}
                        {role.sellerStatus && role.sellerStatus !== 'APPROVED' && ` (${role.sellerStatus})`}
                        {role.riderStatus && role.riderStatus !== 'APPROVED' && ` (${role.riderStatus})`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Statistics */}
                <div>
                  <h3 className="font-semibold mb-3">Statistics</h3>
                  <div className="grid grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{userDetails.stats.totalOrders}</div>
                      <div className="text-xs text-gray-600">Orders</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{userDetails.stats.totalReviews}</div>
                      <div className="text-xs text-gray-600">Reviews</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{userDetails.stats.totalDisputes}</div>
                      <div className="text-xs text-gray-600">Disputes</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-2xl font-bold">{userDetails.stats.totalAddresses}</div>
                      <div className="text-xs text-gray-600">Addresses</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-lg font-bold">{formatCurrency(userDetails.stats.totalSpent || 0)}</div>
                      <div className="text-xs text-gray-600">Total Spent</div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                {userDetails.orders && userDetails.orders.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Orders ({userDetails.stats.totalOrders} total)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userDetails.orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">#{order.orderNumber}</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.shop.name} • {new Date(order.createdAt).toLocaleDateString()} • {order.status}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Reviews */}
                {userDetails.reviews && userDetails.reviews.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Reviews ({userDetails.stats.totalReviews} total)</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userDetails.reviews.slice(0, 5).map((review: any) => (
                        <div key={review.id} className="border rounded p-2 text-sm">
                          <div className="flex justify-between">
                            <span>Order #{review.order.orderNumber}</span>
                            <span>{review.rating}⭐</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{review.comment || 'No comment'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Disputes */}
                {userDetails.disputes && userDetails.disputes.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 text-red-600">
                      Recent Disputes ({userDetails.stats.totalDisputes} total)
                    </h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {userDetails.disputes.slice(0, 5).map((dispute: any) => (
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
            ) : selectedUser && (
              <div className="text-center py-4 text-gray-500">
                Failed to load user details
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowDetailsDialog(false)
                setUserDetails(null)
              }}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedUser?.isSuspended ? 'Unsuspend User' : 'Suspend User'}
              </DialogTitle>
              <DialogDescription>
                {selectedUser?.isSuspended
                  ? 'Are you sure you want to unsuspend this user? They will regain access to their account.'
                  : 'Are you sure you want to suspend this user? They will lose access to their account.'}
              </DialogDescription>
            </DialogHeader>
            {!selectedUser?.isSuspended && (
              <div>
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Input
                  id="reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension..."
                  className="mt-2"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                Cancel
              </Button>
              <Button
                variant={selectedUser?.isSuspended ? 'default' : 'destructive'}
                onClick={confirmSuspend}
                disabled={processing === selectedUser?.id}
              >
                {processing === selectedUser?.id ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : selectedUser?.isSuspended ? (
                  'Unsuspend'
                ) : (
                  'Suspend'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
