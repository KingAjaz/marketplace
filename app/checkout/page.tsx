'use client'

/**
 * Checkout Page
 * 
 * Allows users to:
 * - Select from saved addresses
 * - Add a new address for this order
 * - Enter delivery information manually
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency, calculatePlatformFee } from '@/lib/utils'
import { Loader2, MapPin, Plus, Check } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import { AddressAutocomplete } from '@/components/address-autocomplete'

interface Address {
  id: string
  label: string | null
  street: string
  city: string
  state: string
  postalCode: string | null
  phone: string | null
  notes: string | null
  isDefault: boolean
  latitude: number | null
  longitude: number | null
  addressText: string | null
}

export default function CheckoutPage() {
  const { user, status } = useAuth()
  const router = useRouter()
  const { items, getTotal, clearCart } = useCart()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [loadingAddresses, setLoadingAddresses] = useState(true)
  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryPhone: '',
    notes: '',
    deliveryLatitude: null as number | null,
    deliveryLongitude: null as number | null,
  })
  const [deliveryFee, setDeliveryFee] = useState(500) // Default fee
  const [calculatingFee, setCalculatingFee] = useState(false)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!user || status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (items.length === 0) {
      router.push('/cart')
      return
    }

    // Redirect to profile completion if phone number is missing
    if (!user.phoneNumber) {
      router.push('/auth/complete-profile')
      return
    }

    // Pre-fill phone if available
    if (user.phoneNumber) {
      setFormData((prev) => ({
        ...prev,
        deliveryPhone: user.phoneNumber || '',
      }))
    }

    // Load saved addresses
    fetchAddresses()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status, items.length, router])

  const calculateDeliveryFeeForAddress = async (
    shopId: string,
    lat: number | null,
    lng: number | null
  ) => {
    if (!lat || !lng) {
      setDeliveryFee(500) // Default fee
      return
    }

    setCalculatingFee(true)
    try {
      const response = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          deliveryLatitude: lat,
          deliveryLongitude: lng,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDeliveryFee(data.deliveryFee || 500)
      }
    } catch (error) {
      console.error('Failed to calculate delivery fee:', error)
      setDeliveryFee(500) // Default on error
    } finally {
      setCalculatingFee(false)
    }
  }

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses')
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
        
        // Auto-select default address if available
        const defaultAddress = data.addresses?.find((a: Address) => a.isDefault)
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id)
          setFormData({
            deliveryAddress: defaultAddress.addressText || defaultAddress.street,
            deliveryCity: defaultAddress.city,
            deliveryState: defaultAddress.state,
            deliveryPhone: defaultAddress.phone || user?.phoneNumber || '',
            notes: defaultAddress.notes || '',
            deliveryLatitude: defaultAddress.latitude,
            deliveryLongitude: defaultAddress.longitude,
          })

          // Calculate delivery fee for default address if coordinates available
          if (items.length > 0 && defaultAddress.latitude && defaultAddress.longitude) {
            const shopId = items[0].shopId
            calculateDeliveryFeeForAddress(shopId, defaultAddress.latitude, defaultAddress.longitude)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error)
    } finally {
      setLoadingAddresses(false)
    }
  }

  const handleAddressSelect = (address: Address) => {
    setSelectedAddressId(address.id)
    setUseNewAddress(false)
    setFormData({
      deliveryAddress: address.addressText || address.street,
      deliveryCity: address.city,
      deliveryState: address.state,
      deliveryPhone: address.phone || user?.phoneNumber || '',
      notes: address.notes || '',
      deliveryLatitude: address.latitude,
      deliveryLongitude: address.longitude,
    })

    // Calculate delivery fee if coordinates are available
    if (items.length > 0 && address.latitude && address.longitude) {
      const shopId = items[0].shopId // All items in cart should be from same shop for now
      calculateDeliveryFeeForAddress(shopId, address.latitude, address.longitude)
    }
  }

  const handleUseNewAddress = () => {
    setUseNewAddress(true)
    setSelectedAddressId(null)
    setFormData({
      deliveryAddress: '',
      deliveryCity: '',
      deliveryState: '',
      deliveryPhone: user?.phoneNumber || '',
      notes: '',
      deliveryLatitude: null,
      deliveryLongitude: null,
    })
  }

  const handleAddressAutocompleteSelect = (details: {
    formattedAddress: string
    latitude: number | null
    longitude: number | null
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }) => {
    setFormData((prev) => ({
      ...prev,
      deliveryAddress: details.formattedAddress || details.street,
      deliveryCity: details.city,
      deliveryState: details.state,
      deliveryLatitude: details.latitude,
      deliveryLongitude: details.longitude,
    }))

    // Calculate delivery fee if coordinates are available
    if (items.length > 0 && details.latitude && details.longitude) {
      const shopId = items[0].shopId // All items in cart should be from same shop for now
      calculateDeliveryFeeForAddress(shopId, details.latitude, details.longitude)
    }
  }

  const subtotal = getTotal()
  const platformFee = calculatePlatformFee(subtotal)
  const total = subtotal + platformFee + deliveryFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.deliveryAddress || !formData.deliveryCity || !formData.deliveryState || !formData.deliveryPhone) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required delivery information',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // If using a saved address, optionally save it if it's a new one
      let addressToSave = null
      if (useNewAddress && formData.deliveryAddress && formData.deliveryCity && formData.deliveryState) {
        // Optionally save the new address
        // For now, we'll just use it for this order
      }

      // Use coordinates from formData (set by autocomplete or from selected address)
      const deliveryLatitude = formData.deliveryLatitude
      const deliveryLongitude = formData.deliveryLongitude

      // Re-calculate delivery fee on server side (for accuracy)
      // The server will use the same calculation logic
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          deliveryAddress: formData.deliveryAddress,
          deliveryCity: formData.deliveryCity,
          deliveryState: formData.deliveryState,
          deliveryPhone: formData.deliveryPhone,
          notes: formData.notes,
          deliveryLatitude,
          deliveryLongitude,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Order creation failed:', { status: response.status, data })
        toast({
          title: 'Order Creation Failed',
          description: data.error || 'Failed to create order. Please try again.',
          variant: 'destructive',
        })
        throw new Error(data.error || 'Failed to create order')
      }

      // Check if order was created successfully
      if (!data.order || !data.order.id) {
        console.error('Order creation response missing order ID:', { response: response.status, data })
        toast({
          title: 'Order Creation Error',
          description: 'Order was created but no order ID was returned. Please check your orders page.',
          variant: 'destructive',
        })
        // Redirect to orders page as fallback
        router.push('/orders')
        return
      }

      console.log('Order created successfully, redirecting to payment:', { 
        orderId: data.order.id, 
        orderNumber: data.order.orderNumber,
        status: data.order.status,
        totalOrders: data.orders?.length || 1
      })

      // DO NOT clear cart here - cart will be cleared after payment is confirmed
      // This ensures if payment fails, user still has items in cart
      
      // Redirect to payment page - use window.location.href for immediate redirect
      const paymentUrl = `/orders/${data.order.id}/payment`
      console.log('Redirecting to payment page:', paymentUrl)
      
      // Use window.location.href for immediate redirect to avoid Next.js routing issues
      window.location.href = paymentUrl
    } catch (error: any) {
      toast({
        title: 'Order Creation Failed',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || items.length === 0) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            <div className="md:col-span-2 space-y-4 sm:space-y-6">
              {/* Saved Addresses Section */}
              {!loadingAddresses && addresses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Addresses</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => handleAddressSelect(address)}
                        className={`p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300 active:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="h-4 w-4 text-gray-500" />
                              <span className="font-semibold">
                                {address.label || 'Address'}
                                {address.isDefault && (
                                  <span className="ml-2 text-xs text-primary">(Default)</span>
                                )}
                              </span>
                              {selectedAddressId === address.id && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {address.street}, {address.city}, {address.state}
                            </p>
                            {address.phone && (
                              <p className="text-xs text-gray-500 mt-1">Phone: {address.phone}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleUseNewAddress}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Use Different Address
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* New Address Form */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {addresses.length > 0 && !useNewAddress
                      ? 'Delivery Information'
                      : 'Delivery Address'}
                  </CardTitle>
                  {addresses.length === 0 && (
                    <p className="text-sm text-gray-600 mt-2">
                      <Link href="/account/addresses" className="text-primary hover:underline">
                        Save addresses
                      </Link>{' '}
                      for faster checkout next time
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="deliveryAddress">Street Address *</Label>
                    {useNewAddress || addresses.length === 0 ? (
                      <AddressAutocomplete
                        value={formData.deliveryAddress}
                        onChange={(value) =>
                          setFormData({ ...formData, deliveryAddress: value })
                        }
                        onSelect={handleAddressAutocompleteSelect}
                        placeholder="Start typing an address..."
                        disabled={!useNewAddress && selectedAddressId !== null && addresses.length > 0}
                        className="mt-2"
                      />
                    ) : (
                      <Input
                        id="deliveryAddress"
                        value={formData.deliveryAddress}
                        onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                        required
                        placeholder="Street address, house number"
                        disabled={!useNewAddress && selectedAddressId !== null && addresses.length > 0}
                        className="mt-2"
                      />
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {useNewAddress || addresses.length === 0
                        ? 'Start typing to see address suggestions'
                        : 'Select from saved addresses above or use different address'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="deliveryCity">City *</Label>
                      <Input
                        id="deliveryCity"
                        value={formData.deliveryCity}
                        onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                        required
                        placeholder="Lagos"
                        disabled={!useNewAddress && selectedAddressId !== null && addresses.length > 0}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryState">State *</Label>
                      <Input
                        id="deliveryState"
                        value={formData.deliveryState}
                        onChange={(e) => setFormData({ ...formData, deliveryState: e.target.value })}
                        required
                        placeholder="Lagos"
                        disabled={!useNewAddress && selectedAddressId !== null && addresses.length > 0}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="deliveryPhone">Contact Phone *</Label>
                    <Input
                      id="deliveryPhone"
                      type="tel"
                      value={formData.deliveryPhone}
                      onChange={(e) => setFormData({ ...formData, deliveryPhone: e.target.value })}
                      required
                      placeholder="08012345678"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Phone number for delivery contact (can be different from your account phone)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any special instructions for delivery"
                      disabled={!useNewAddress && selectedAddressId !== null && addresses.length > 0}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span>{formatCurrency(platformFee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span>Delivery Fee</span>
                      {calculatingFee && (
                        <span className="text-xs text-gray-500 ml-2">(calculating...)</span>
                      )}
                      {!calculatingFee && !formData.deliveryLatitude && (
                        <span className="text-xs text-gray-500 ml-2">(estimated)</span>
                      )}
                    </div>
                    <span>{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <Button type="submit" className="w-full touch-manipulation" size="lg" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Place Order'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
