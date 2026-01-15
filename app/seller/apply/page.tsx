'use client'

/**
 * Seller Application Page
 * 
 * Allows users to apply to become a seller.
 * Application is submitted for admin approval.
 * Users must have completed their profile (phone number) before applying.
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default function SellerApplyPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [formData, setFormData] = useState({
    shopName: '',
    businessDescription: '',
    businessAddress: '',
    city: '',
    state: '',
    businessType: '',
    businessRegistrationNumber: '',
  })

  useEffect(() => {
    if (status === 'loading') {
      return // Wait for session to load
    }

    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/seller/apply')
      return
    }

    if (status === 'authenticated') {
      // Check if user has phone number
      if (!session?.user?.phoneNumber) {
        console.log('No phone number, redirecting to complete profile')
        router.push('/auth/complete-profile?redirect=/seller/apply')
        return
      }

      console.log('Phone number exists:', session.user.phoneNumber)

      // Check if user already has seller role
      if (session.user.roles?.includes('SELLER')) {
        router.push('/seller/dashboard')
        return
      }

      // Check application status
      checkApplicationStatus()
    }
  }, [status, session, router])

  const checkApplicationStatus = async () => {
    try {
      const response = await fetch('/api/seller/application/status')
      if (response.ok) {
        const data = await response.json()
        if (data.status) {
          setApplicationStatus(data.status)
        }
      }
    } catch (err) {
      console.error('Failed to check application status:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validate required fields
    if (!formData.shopName.trim()) {
      setError('Shop/Business name is required')
      return
    }
    if (!formData.businessDescription.trim()) {
      setError('Business description is required')
      return
    }
    if (!formData.businessAddress.trim()) {
      setError('Business address is required')
      return
    }
    if (!formData.city.trim()) {
      setError('City is required')
      return
    }
    if (!formData.state.trim()) {
      setError('State is required')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/seller/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to submit application')
        setLoading(false)
        return
      }

      setSuccess(true)
      setApplicationStatus('pending')
    } catch (err: any) {
      console.error('Application submission error:', err)
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

  if (status === 'unauthenticated') {
    return null
  }

  // Show loading while checking if phone number exists (might be redirecting)
  if (status === 'authenticated' && !session?.user?.phoneNumber) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to complete profile...</p>
        </div>
      </div>
    )
  }

  // Show application status if already applied
  if (applicationStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <Clock className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl text-center">Application Pending</CardTitle>
            <CardDescription className="text-center">
              Your seller application is under review
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              We're reviewing your application. You'll be notified once a decision is made.
            </p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (applicationStatus === 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-center">Application Approved!</CardTitle>
            <CardDescription className="text-center">
              You can now access the seller dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Link href="/seller/dashboard">
              <Button>Go to Seller Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Application Rejected</CardTitle>
            <CardDescription className="text-center">
              Your seller application was not approved
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Please contact support if you have questions about this decision.
            </p>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-center">Application Submitted!</CardTitle>
            <CardDescription className="text-center">
              Your seller application has been submitted for review
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Our team will review your application and get back to you soon.
            </p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Store className="h-8 w-8 text-primary" />
              <CardTitle className="text-3xl">Become a Seller</CardTitle>
            </div>
            <CardDescription>
              Apply to start selling on our marketplace. All sellers are verified and approved by our team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="shopName">Shop/Business Name *</Label>
                  <Input
                    id="shopName"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    required
                    placeholder="e.g., Fresh Foods Market"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be your shop name visible to customers
                  </p>
                </div>

                <div>
                  <Label htmlFor="businessDescription">Business Description *</Label>
                  <textarea
                    id="businessDescription"
                    value={formData.businessDescription}
                    onChange={(e) => setFormData({ ...formData, businessDescription: e.target.value })}
                    required
                    rows={4}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe your business, products, and what makes you unique..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tell customers about your business and what you sell
                  </p>
                </div>

                <div>
                  <Label htmlFor="businessAddress">Business Address *</Label>
                  <Input
                    id="businessAddress"
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                    required
                    placeholder="Street address, building number"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      placeholder="Lagos"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      required
                      placeholder="Lagos"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="businessType">Type of Business *</Label>
                  <select
                    id="businessType"
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select business type</option>
                    <option value="FOODSTUFFS">Foodstuffs</option>
                    <option value="MEAT_PROTEIN">Meat & Protein</option>
                    <option value="LIVE_ANIMALS">Live Animals</option>
                    <option value="PROCESSED_FOODS">Processed Foods</option>
                    <option value="MIXED">Mixed (Multiple Categories)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    What category of products will you primarily sell?
                  </p>
                </div>

                <div>
                  <Label htmlFor="businessRegistrationNumber">Business Registration Number (Optional)</Label>
                  <Input
                    id="businessRegistrationNumber"
                    value={formData.businessRegistrationNumber}
                    onChange={(e) => setFormData({ ...formData, businessRegistrationNumber: e.target.value })}
                    placeholder="RC123456 or BN123456"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If you have a registered business, provide your registration number
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Application Process:</h3>
                <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                  <li>Submit your application with the information above</li>
                  <li>Our admin team will review your application</li>
                  <li>You'll be notified within 24-48 hours</li>
                  <li>Once approved, you can start adding products and selling</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </Button>
                <Link href="/">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-gray-500 text-center">
                By submitting, you agree to our seller terms and conditions. All information provided must be accurate.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
