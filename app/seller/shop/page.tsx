'use client'

/**
 * Shop Settings Page
 * 
 * Manage shop information and settings
 */
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Save, Store, Upload } from 'lucide-react'
import Link from 'next/link'

interface OperatingHours {
  [key: string]: {
    open: string
    close: string
    closed: boolean
  }
}

interface Shop {
  id: string
  name: string
  description: string | null
  address: string | null
  city: string | null
  state: string | null
  logo: string | null
  banner: string | null
  operatingHours: string | null
}

export default function ShopSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<{ logo: boolean; banner: boolean }>({
    logo: false,
    banner: false,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState<Shop>({
    id: '',
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    logo: '',
    banner: '',
    operatingHours: null,
  })
  const [operatingHours, setOperatingHours] = useState<OperatingHours>({
    monday: { open: '08:00', close: '18:00', closed: false },
    tuesday: { open: '08:00', close: '18:00', closed: false },
    wednesday: { open: '08:00', close: '18:00', closed: false },
    thursday: { open: '08:00', close: '18:00', closed: false },
    friday: { open: '08:00', close: '18:00', closed: false },
    saturday: { open: '08:00', close: '18:00', closed: false },
    sunday: { open: '08:00', close: '18:00', closed: false },
  })

  useEffect(() => {
    fetchShop()
  }, [])

  const fetchShop = async () => {
    try {
      const response = await fetch('/api/seller/shop')
      if (response.ok) {
        const data = await response.json()
        setFormData({
          id: data.shop.id,
          name: data.shop.name || '',
          description: data.shop.description || '',
          address: data.shop.address || '',
          city: data.shop.city || '',
          state: data.shop.state || '',
          logo: data.shop.logo || '',
          banner: data.shop.banner || '',
          operatingHours: data.shop.operatingHours || null,
        })
        
        // Parse operating hours if they exist
        if (data.shop.operatingHours) {
          try {
            const parsed = JSON.parse(data.shop.operatingHours)
            setOperatingHours(parsed)
          } catch (e) {
            console.error('Failed to parse operating hours:', e)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch shop:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    try {
      const response = await fetch('/api/seller/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          operatingHours: JSON.stringify(operatingHours),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update shop')
        setSaving(false)
        return
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (type: 'logo' | 'banner', file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploading({ ...uploading, [type]: true })
    setError('')

    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image')
      }

      // Update the image URL in form data
      setFormData({ ...formData, [type]: data.url })
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading({ ...uploading, [type]: false })
    }
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload('logo', file)
    }
  }

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload('banner', file)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6">
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Store className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Shop Settings</CardTitle>
                <CardDescription>Manage your shop information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                  Shop settings updated successfully!
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="name">Shop Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Your Shop Name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Describe your shop..."
                />
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lagos"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Lagos"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="logo">Shop Logo</Label>
                <p className="text-xs text-gray-500 mb-2">Upload an image or paste a URL</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="logo"
                    type="text"
                    value={formData.logo || ''}
                    onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    placeholder="Upload file or paste image URL"
                    className="flex-1"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading.logo}
                  >
                    {uploading.logo ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.logo && (
                  <div className="mt-2">
                    <img
                      src={formData.logo}
                      alt="Logo preview"
                      className="h-20 w-20 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="banner">Shop Banner</Label>
                <p className="text-xs text-gray-500 mb-2">Upload an image or paste a URL</p>
                <div className="flex gap-2 mb-2">
                  <Input
                    id="banner"
                    type="text"
                    value={formData.banner || ''}
                    onChange={(e) => setFormData({ ...formData, banner: e.target.value })}
                    placeholder="Upload file or paste image URL"
                    className="flex-1"
                  />
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading.banner}
                  >
                    {uploading.banner ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {formData.banner && (
                  <div className="mt-2">
                    <img
                      src={formData.banner}
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded border"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Operating Hours */}
              <div>
                <Label>Operating Hours</Label>
                <p className="text-xs text-gray-500 mb-4">Set your shop's operating hours for each day</p>
                <div className="space-y-3 border rounded-lg p-4">
                  {Object.entries(operatingHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-4 flex-wrap">
                      <div className="w-24">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!hours.closed}
                            onChange={(e) =>
                              setOperatingHours({
                                ...operatingHours,
                                [day]: { ...hours, closed: !e.target.checked },
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm font-medium capitalize">{day}</span>
                        </label>
                      </div>
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) =>
                              setOperatingHours({
                                ...operatingHours,
                                [day]: { ...hours, open: e.target.value },
                              })
                            }
                            className="w-32"
                          />
                          <span className="text-sm text-gray-500">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) =>
                              setOperatingHours({
                                ...operatingHours,
                                [day]: { ...hours, close: e.target.value },
                              })
                            }
                            className="w-32"
                          />
                        </>
                      )}
                      {hours.closed && (
                        <span className="text-sm text-gray-500 italic">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/seller/dashboard">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
