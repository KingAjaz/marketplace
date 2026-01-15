'use client'

/**
 * Profile Completion Page
 * 
 * After signup/login, users must provide a phone number before using the app.
 * Phone number is used for delivery contact, not for authentication.
 * No OTP verification is required - phone number is stored directly.
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { update } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { normalizePhoneNumber, validateNigerianPhone } from '@/lib/utils'
import { AddressAutocomplete } from '@/components/address-autocomplete'

export default function CompleteProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState({
    label: 'Home',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    notes: '',
    addressText: '',
    latitude: null as number | null,
    longitude: null as number | null,
  })
  const [error, setError] = useState('')
  const [validationWarning, setValidationWarning] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }
    
    if (status === 'authenticated') {
      // If phone number already exists, redirect to home or specified redirect
      if (session?.user?.phoneNumber) {
        const redirect = searchParams.get('redirect')
        router.push(redirect || '/')
        return
      }
    }
  }, [status, session, router, searchParams])

  // Validate phone number format in real-time
  const handlePhoneChange = (value: string) => {
    setPhone(value)
    setError('')
    setValidationWarning('')

    if (value.trim()) {
      const normalized = normalizePhoneNumber(value)
      
      // Basic regex validation warning (not blocking)
      const nigerianPattern = /^(\+234|0)[789][01]\d{8}$/
      const cleaned = normalized.replace(/\s+/g, '')
      
      if (!nigerianPattern.test(cleaned)) {
        setValidationWarning('⚠️ This doesn\'t look like a valid Nigerian phone number. Please double-check.')
      } else {
        setValidationWarning('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setValidationWarning('')

    // Check if user is authenticated
    if (status !== 'authenticated' || !session) {
      setError('Please sign in to continue')
      router.push('/auth/signin')
      return
    }

    // Validate phone number
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }

    setLoading(true)
    try {
      const normalizedPhone = normalizePhoneNumber(phone)
      
      // Validate the normalized phone number
      if (!validateNigerianPhone(normalizedPhone)) {
        setError('Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)')
        setLoading(false)
        return
      }
      
      // First, update phone number
      const phoneResponse = await fetch('/api/auth/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: normalizedPhone }),
      })

      let phoneData
      try {
        phoneData = await phoneResponse.json()
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        setError('Server error. Please try again.')
        setLoading(false)
        return
      }

      if (!phoneResponse.ok) {
        const errorMsg = phoneData.error || phoneData.message || 'Failed to update profile'
        console.error('API error:', errorMsg, phoneData)
        setError(errorMsg)
        setLoading(false)
        return
      }

      // Then, create default address if address fields are provided
      if (address.street && address.city && address.state) {
        const addressResponse = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: address.label || 'Home',
            street: address.street,
            city: address.city,
            state: address.state,
            postalCode: address.postalCode || null,
            country: 'Nigeria',
            addressText: address.addressText || null,
            latitude: address.latitude,
            longitude: address.longitude,
            isDefault: true,
            phone: normalizedPhone,
            notes: address.notes || null,
          }),
        })

        if (!addressResponse.ok) {
          console.warn('Failed to save address, but phone number was saved')
          // Continue anyway - phone number is more important
        }
      }

      // Profile updated successfully

      // Profile updated successfully
      setSuccess(true)
      
      // Refresh session to get updated phoneNumber
      try {
        await update()
        // Wait a moment for session to fully update
        await new Promise(resolve => setTimeout(resolve, 1500))
      } catch (updateError) {
        console.error('Session update error:', updateError)
        // Continue even if session update fails - the data is saved
      }
      
      // Redirect to specified page or home
      const redirect = searchParams.get('redirect')
      console.log('[Complete Profile] Redirect URL from params:', redirect)
      
      if (redirect) {
        // Ensure redirect is a valid path
        const redirectPath = redirect.startsWith('/') ? redirect : `/${redirect}`
        console.log('[Complete Profile] Redirecting to:', redirectPath)
        
        // Small delay to show success message, then redirect
        setTimeout(() => {
          // Force a full page reload to ensure fresh session
          if (typeof window !== 'undefined') {
            window.location.href = redirectPath
          }
        }, 1000)
      } else {
        console.log('[Complete Profile] No redirect, going to home')
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1000)
      }
    } catch (err: any) {
      console.error('Profile update error:', err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If not authenticated, don't render (redirect will happen)
  if (status === 'unauthenticated') {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Complete Your Profile</CardTitle>
          <CardDescription className="text-center">
            Add your phone number to continue. This will be used for delivery contact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                ✓ Profile updated successfully! Redirecting...
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {validationWarning && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                {validationWarning}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  handlePhoneChange(e.target.value)
                  setAddress({ ...address, phone: e.target.value })
                }}
                required
                placeholder="08012345678 or +2348012345678"
                className={validationWarning ? 'border-yellow-300' : ''}
              />
              <p className="text-xs text-gray-500">
                Nigerian phone number required for delivery contact (e.g., 08012345678)
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Delivery Address (Optional but Recommended)</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Save your address for faster checkout. You can add more addresses later.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLabel">Address Label</Label>
                <Input
                  id="addressLabel"
                  value={address.label}
                  onChange={(e) => setAddress({ ...address, label: e.target.value })}
                  placeholder="Home, Work, Office, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <AddressAutocomplete
                  value={address.addressText || address.street}
                  onChange={(value) =>
                    setAddress({ ...address, addressText: value, street: value })
                  }
                  onSelect={(details) => {
                    setAddress({
                      ...address,
                      addressText: details.formattedAddress || details.street,
                      street: details.street || details.formattedAddress,
                      city: details.city,
                      state: details.state,
                      postalCode: details.postalCode || address.postalCode,
                      latitude: details.latitude,
                      longitude: details.longitude,
                    })
                  }}
                  placeholder="Start typing an address..."
                />
                <p className="text-xs text-gray-500">
                  Start typing to see address suggestions with autocomplete
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Lagos (auto-filled from address selection)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="Lagos (auto-filled from address selection)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                <Input
                  id="postalCode"
                  value={address.postalCode}
                  onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                  placeholder="100001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressNotes">Delivery Instructions (Optional)</Label>
                <Input
                  id="addressNotes"
                  value={address.notes}
                  onChange={(e) => setAddress({ ...address, notes: e.target.value })}
                  placeholder="e.g., Call before delivery, Gate code: 1234"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Complete Profile'}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Your phone number will be used by riders and admins to contact you during deliveries.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
