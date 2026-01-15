'use client'

/**
 * Seller Products Management Page
 * 
 * Allows sellers to view, add, edit, and delete their products
 */
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { ProductCategory } from '@prisma/client'
import { Plus, Edit, Trash2, Package, Search, Download, Upload } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'

interface Product {
  id: string
  name: string
  description: string | null
  category: ProductCategory
  images: string[]
  isAvailable: boolean
  pricingUnits: {
    id: string
    unit: string
    price: number
    stock: number | null
    isActive: boolean
  }[]
  createdAt: string
}

export default function SellerProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'FOODSTUFFS' as ProductCategory,
    images: [''],
    pricingUnits: [{ unit: '', price: 0, stock: null }],
  })
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/seller/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return
    }

    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchProducts()
        toast({
          title: 'Product Deleted',
          description: 'Product has been deleted successfully',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Delete Failed',
          description: 'Failed to delete product',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to delete product:', error)
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete product',
        variant: 'destructive',
      })
    }
  }

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/seller/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      })

      if (response.ok) {
        fetchProducts()
      }
    } catch (error) {
      console.error('Failed to update product:', error)
    }
  }

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const response = await fetch('/api/seller/products/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `products-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast({
          title: 'Export Successful',
          description: 'Products exported to CSV file',
          variant: 'success',
        })
      } else {
        toast({
          title: 'Export Failed',
          description: 'Failed to export products',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to export products:', error)
      toast({
        title: 'Export Failed',
        description: 'Failed to export products',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a CSV file',
        variant: 'destructive',
      })
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/seller/products/import', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: 'Import Successful',
          description: `Created ${data.created} products, updated ${data.updated} products`,
          variant: 'success',
        })
        if (data.errors && data.errors.length > 0) {
          console.warn('Import errors:', data.errors)
        }
        fetchProducts()
      } else {
        const errorData = await response.json()
        toast({
          title: 'Import Failed',
          description: errorData.error || 'Failed to import products',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to import products:', error)
      toast({
        title: 'Import Failed',
        description: 'Failed to import products',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Products</h1>
            <p className="text-gray-600">Add, edit, and manage your products</p>
          </div>
          <Link href="/seller/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting || products.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                  disabled={importing}
                />
                <Button variant="outline" asChild disabled={importing}>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? 'Importing...' : 'Import CSV'}
                  </span>
                </Button>
              </label>
              <Link href="/seller/products/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {search ? 'No products found matching your search' : 'No products yet'}
              </p>
              {!search && (
                <Link href="/seller/products/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Product
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const minPrice = Math.min(...product.pricingUnits.map((u) => u.price))
              const primaryUnit = product.pricingUnits[0]

              return (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-square bg-gray-200 overflow-hidden">
                    {product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {product.category.replace('_', ' ')}
                        </CardDescription>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          product.isAvailable
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(minPrice)}
                        </span>
                        <span className="text-sm text-gray-500">/{primaryUnit?.unit}</span>
                      </div>
                      {product.pricingUnits.length > 1 && (
                        <p className="text-xs text-gray-500">
                          {product.pricingUnits.length} pricing options
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/seller/products/${product.id}/edit`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleAvailability(product.id, product.isAvailable)}
                      >
                        {product.isAvailable ? 'Hide' : 'Show'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
