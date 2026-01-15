'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Package, MapPin, CheckCircle, Clock, Navigation, DollarSign, Power, PowerOff } from 'lucide-react'
import Link from 'next/link'
import { useRiderLocation } from '@/hooks/use-rider-location'
import { useToast } from '@/hooks/use-toast'

interface Delivery {
  id: string
  order: {
    id: string
    orderNumber: string
    total: number
    deliveryAddress: string
    deliveryCity: string
    deliveryState: string
  }
  status: string
}

export default function RiderDashboard() {
  const { data: session, status: sessionStatus, update: updateSession } = useSession()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [togglingAvailability, setTogglingAvailability] = useState(false)
  const { toast } = useToast()

  // Track location for active delivery in transit
  const activeDelivery = deliveries.find(
    (d) => d.id === activeDeliveryId && (d.status === 'IN_TRANSIT' || d.status === 'PICKED_UP')
  )
  
  const { location, error: locationError, isUpdating } = useRiderLocation({
    enabled: !!activeDelivery,
    deliveryId: activeDeliveryId || undefined,
    updateInterval: 5000, // Update every 5 seconds
  })

  const [sessionRefreshed, setSessionRefreshed] = useState(false)

  // Refresh session on mount to ensure roles are up-to-date (in case user was just approved)
  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user && !sessionRefreshed) {
      const hasRiderRole = session.user.roles?.includes('RIDER')
      if (!hasRiderRole) {
        // Try refreshing session once to get updated roles
        updateSession()
          .then(() => {
            setSessionRefreshed(true)
          })
          .catch((error) => {
            console.error('Failed to refresh session:', error)
            setSessionRefreshed(true) // Mark as refreshed even on error to avoid loops
          })
      } else {
        setSessionRefreshed(true)
      }
    } else if (sessionStatus === 'authenticated' && session?.user && sessionRefreshed) {
      // After refresh, check if user has rider role
      const hasRiderRole = session.user.roles?.includes('RIDER')
      if (!hasRiderRole) {
        // Check application status
        fetch('/api/rider/status')
          .then((res) => res.json())
          .then((data) => {
            if (data.status === 'pending') {
              router.push('/rider/apply?message=Your application is pending approval')
            } else if (data.status === 'none') {
              router.push('/rider/apply')
            } else if (data.status === 'approved' && data.isActive) {
              // User is approved but session doesn't have role - need to sign out/in
              router.push('/auth/signin?message=Please sign out and sign back in to access your rider dashboard')
            } else {
              router.push('/unauthorized')
            }
          })
          .catch(() => {
            router.push('/unauthorized')
          })
      }
    }
  }, [sessionStatus, session, sessionRefreshed, updateSession, router])

  // Redirect if not authenticated
  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/rider/dashboard')
    }
  }, [sessionStatus, router])

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.roles?.includes('RIDER')) {
      fetchDeliveries()
      fetchAvailability()
    }
  }, [sessionStatus, session])

  const fetchAvailability = async () => {
    try {
      const response = await fetch('/api/rider/availability')
      if (response.ok) {
        const data = await response.json()
        setIsOnline(data.isOnline || false)
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error)
    }
  }

  const handleToggleAvailability = async () => {
    setTogglingAvailability(true)
    try {
      const response = await fetch('/api/rider/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsOnline(data.isOnline)
        toast({
          title: 'Status Updated',
          description: data.message || (data.isOnline ? 'You are now online' : 'You are now offline'),
          variant: 'default',
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update availability')
      }
    } catch (error: any) {
      console.error('Failed to toggle availability:', error)
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update availability status',
        variant: 'destructive',
      })
    } finally {
      setTogglingAvailability(false)
    }
  }

  // Auto-select first active delivery for location tracking
  useEffect(() => {
    const inTransit = deliveries.find((d) => d.status === 'IN_TRANSIT' || d.status === 'PICKED_UP')
    if (inTransit && !activeDeliveryId) {
      setActiveDeliveryId(inTransit.id)
    }
  }, [deliveries, activeDeliveryId])

  const fetchDeliveries = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/rider/deliveries')
      const data = await response.json()
      
      if (response.ok) {
        setDeliveries(data.deliveries || [])
      } else {
        console.error('Failed to fetch deliveries:', data.error)
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch deliveries',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch deliveries. Please refresh the page.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (deliveryId: string, status: string) => {
    try {
      const response = await fetch(`/api/rider/deliveries/${deliveryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const data = await response.json()

      if (response.ok) {
        // Show success message
        const statusMessages: Record<string, string> = {
          ASSIGNED: 'Delivery accepted successfully!',
          PICKED_UP: 'Delivery marked as picked up!',
          IN_TRANSIT: 'Delivery in transit!',
          DELIVERED: 'Delivery marked as delivered!',
        }
        
        toast({
          title: 'Success',
          description: statusMessages[status] || 'Status updated successfully',
          variant: 'default',
        })

        // Refresh deliveries to show updated status
        await fetchDeliveries()
      } else {
        throw new Error(data.error || 'Failed to update delivery status')
      }
    } catch (error: any) {
      console.error('Failed to update delivery status:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update delivery status',
        variant: 'destructive',
      })
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // Don't render if user is not authenticated or not a rider (redirect will handle it)
  if (sessionStatus === 'unauthenticated' || !session?.user?.roles?.includes('RIDER')) {
    return null
  }

  // Pending deliveries: only unassigned PENDING (available for acceptance)
  const pendingDeliveries = deliveries.filter((d) => d.status === 'PENDING')
  // Active deliveries: ASSIGNED, PICKED_UP, and IN_TRANSIT (deliveries assigned to this rider)
  const activeDeliveries = deliveries.filter((d) => d.status === 'ASSIGNED' || d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT')

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">Rider Dashboard</h1>
            <p className="text-gray-600">Manage your deliveries</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm font-medium">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <Button
              onClick={handleToggleAvailability}
              disabled={togglingAvailability}
              variant={isOnline ? 'outline' : 'default'}
              size="sm"
            >
              {togglingAvailability ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : isOnline ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Go Offline
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Go Online
                </>
              )}
            </Button>
            <Link href="/rider/earnings">
              <Button variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                View Earnings
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingDeliveries.length === 0 ? (
                <p className="text-gray-500">No pending deliveries</p>
              ) : (
                <div className="space-y-4">
                  {pendingDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Order #{delivery.order.orderNumber}</p>
                          <p className="text-sm text-gray-600">
                            {delivery.order.deliveryAddress}, {delivery.order.deliveryCity}
                          </p>
                        </div>
                        <span className="text-lg font-bold">
                          {formatCurrency(delivery.order.total)}
                        </span>
                      </div>
                      {delivery.status === 'PENDING' && (
                        <Button
                          className="w-full mt-2"
                          onClick={() => handleUpdateStatus(delivery.id, 'ASSIGNED')}
                        >
                          Accept Delivery
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Active Deliveries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeDeliveries.length === 0 ? (
                <p className="text-gray-500">No active deliveries</p>
              ) : (
                <div className="space-y-4">
                  {activeDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold">Order #{delivery.order.orderNumber}</p>
                          <p className="text-sm text-gray-600">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {delivery.order.deliveryAddress}, {delivery.order.deliveryCity}
                          </p>
                          {delivery.status === 'ASSIGNED' && (
                            <p className="text-xs text-blue-600 mt-1">Accepted - Ready to pick up</p>
                          )}
                          {delivery.status === 'PICKED_UP' && (
                            <p className="text-xs text-orange-600 mt-1">Picked up - Ready to deliver</p>
                          )}
                          {delivery.status === 'IN_TRANSIT' && (
                            <p className="text-xs text-green-600 mt-1">In transit</p>
                          )}
                        </div>
                        <span className="text-lg font-bold">
                          {formatCurrency(delivery.order.total)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {delivery.status === 'ASSIGNED' && (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleUpdateStatus(delivery.id, 'PICKED_UP')}
                          >
                            Mark Picked Up
                          </Button>
                        )}
                        {delivery.status === 'PICKED_UP' && (
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              handleUpdateStatus(delivery.id, 'IN_TRANSIT')
                              setActiveDeliveryId(delivery.id)
                            }}
                          >
                            Start Delivery
                          </Button>
                        )}
                        {delivery.status === 'IN_TRANSIT' && (
                          <>
                            {location && (
                              <div className="w-full mb-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
                                <div className="flex items-center gap-2 text-green-700">
                                  <Navigation className="h-4 w-4" />
                                  <span>Location tracking active</span>
                                  {isUpdating && <span className="text-xs">(updating...)</span>}
                                </div>
                              </div>
                            )}
                            {locationError && (
                              <div className="w-full mb-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                Location error: {locationError}
                              </div>
                            )}
                            <Button
                              className="flex-1"
                              onClick={() => {
                                handleUpdateStatus(delivery.id, 'DELIVERED')
                                setActiveDeliveryId(null)
                              }}
                            >
                              Mark Delivered
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
