'use client'

/**
 * Edit Product Page
 */
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductCategory } from '@prisma/client'
import { ArrowLeft, Plus, X, Upload, Image as ImageIcon } from 'lucide-react'
import Link from 'next/link'

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const productId = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<{ [key: number]: boolean }>({})
  const [error, setError] = useState('')
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({})
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'FOODSTUFFS' as ProductCategory,
    images: [''],
    isAvailable: true,
    pricingUnits: [{ id: '', unit: '', price: 0, stock: null }],
  })

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/seller/products/${productId}`)
      if (response.ok) {
        const data = await response.json()
        const product = data.product
        setFormData({
          name: product.name || '',
          description: product.description || '',
          category: product.category,
          images: product.images.length > 0 ? product.images : [''],
          isAvailable: product.isAvailable,
          pricingUnits: product.pricingUnits.map((pu: any) => ({
            id: pu.id,
            unit: pu.unit,
            price: pu.price,
            stock: pu.stock,
          })),
        })
      }
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddImage = () => {
    setFormData({
      ...formData,
      images: [...formData.images, ''],
    })
  }

  const handleRemoveImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    })
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({ ...formData, images: newImages })
  }

  const handleFileUpload = async (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB')
      return
    }

    setUploading({ ...uploading, [index]: true })
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
      const newImages = [...formData.images]
      newImages[index] = data.url
      setFormData({ ...formData, images: newImages })
    } catch (err: any) {
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploading({ ...uploading, [index]: false })
    }
  }

  const handleFileInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(index, file)
    }
  }

  const handleAddPricingUnit = () => {
    setFormData({
      ...formData,
      pricingUnits: [...formData.pricingUnits, { id: '', unit: '', price: 0, stock: null }],
    })
  }

  const handleRemovePricingUnit = (index: number) => {
    if (formData.pricingUnits.length > 1) {
      setFormData({
        ...formData,
        pricingUnits: formData.pricingUnits.filter((_, i) => i !== index),
      })
    }
  }

  const handlePricingUnitChange = (
    index: number,
    field: 'unit' | 'price' | 'stock',
    value: string | number
  ) => {
    const newUnits = [...formData.pricingUnits]
    newUnits[index] = {
      ...newUnits[index],
      [field]: field === 'price' || field === 'stock' ? Number(value) : value,
    }
    setFormData({ ...formData, pricingUnits: newUnits })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim()) {
      setError('Product name is required')
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          images: formData.images.filter((img) => img.trim()),
          isAvailable: formData.isAvailable,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to update product')
        setSaving(false)
        return
      }

      router.push('/seller/products')
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="mb-6">
          <Link href="/seller/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Product</CardTitle>
            <CardDescription>Update product information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as ProductCategory })
                  }
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Object.values(ProductCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Product Images</Label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload images or paste image URLs
                </p>
                {formData.images.map((image, index) => (
                  <div key={index} className="mb-4 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          type="text"
                          value={image}
                          onChange={(e) => handleImageChange(index, e.target.value)}
                          placeholder="Upload file or paste image URL"
                        />
                      </div>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[index] = el
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileInputChange(index, e)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRefs.current[index]?.click()}
                        disabled={uploading[index]}
                        title="Upload image"
                      >
                        {uploading[index] ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      {formData.images.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveImage(index)}
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {image && (
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden bg-gray-100">
                        {image.startsWith('/uploads/') || image.startsWith('http') ? (
                          <img
                            src={image}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className="hidden absolute inset-0 flex items-center justify-center text-gray-400">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={handleAddImage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Image
                </Button>
              </div>

              <div>
                <Label>
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) =>
                      setFormData({ ...formData, isAvailable: e.target.checked })
                    }
                    className="mr-2"
                  />
                  Product is available
                </Label>
              </div>

              <div className="flex gap-4">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href="/seller/products">
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
