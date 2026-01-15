'use client'

/**
 * Shop Detail Page
 * Shows shop information and all products from that shop
 */
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ProductCategory } from '@prisma/client'
import { ArrowLeft, Store, Star, MapPin, Package, Search, MessageSquare, Clock, CheckCircle, XCircle } from 'lucide-react'
import ShopMap from '@/components/shop-map'
import { getShopStatus } from '@/lib/shop-hours'

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  banner: string | null
  address: string | null
  city: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  rating: number
  totalReviews: number
  operatingHours: string | null
  user: {
    name: string | null
    email: string
  }
}

interface Product {
  id: string
  name: string
  description: string | null
  category: ProductCategory
  images: string[]
  pricingUnits: {
    id: string
    unit: string
    price: number
  }[]
}

export default function ShopPage() {
  const params = useParams()
  const shopId = params.id as string
  const [shop, setShop] = useState<Shop | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')

  useEffect(() => {
    fetchShop()
    fetchReviews()
  }, [shopId, category, search])

  const fetchShop = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.append('category', category)
      if (search) params.append('search', search)

      const response = await fetch(`/api/shops/${shopId}?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setShop(data.shop)
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Failed to fetch shop:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReviews = async () => {
    setLoadingReviews(true)
    try {
      const response = await fetch(`/api/reviews?shopId=${shopId}&limit=10`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data.reviews || [])
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setLoadingReviews(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchShop()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shop...</p>
        </div>
      </div>
    )
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Shop Not Found</h2>
            <p className="text-gray-600 mb-4">This shop doesn't exist or is no longer active.</p>
            <Link href="/market">
              <Button>Back to Marketplace</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Shop Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <Link href="/market">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Shop Logo */}
            <div className="flex-shrink-0">
              {shop.logo ? (
                <div className="w-24 h-24 rounded-lg border-2 border-white shadow-lg overflow-hidden">
                  <img
                    src={shop.logo}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Store className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>

            {/* Shop Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{shop.name}</h1>
              {shop.city && shop.state && (
                <div className="flex items-center gap-1 text-gray-600 mb-3">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {shop.address && `${shop.address}, `}
                    {shop.city}, {shop.state}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-4 mb-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold">
                    {shop.rating > 0 ? shop.rating.toFixed(1) : 'New Shop'}
                  </span>
                  {shop.totalReviews > 0 && (
                    <span className="text-gray-600">
                      ({shop.totalReviews} {shop.totalReviews === 1 ? 'review' : 'reviews'})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-gray-600">
                  <Package className="h-5 w-5" />
                  <span>{products.length} {products.length === 1 ? 'product' : 'products'}</span>
                </div>
                {shop.operatingHours && (() => {
                  const status = getShopStatus(shop.operatingHours)
                  return (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                      status.isOpen 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {status.isOpen ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                      <span>{status.message}</span>
                    </div>
                  )
                })()}
              </div>
              {shop.description && (
                <p className="text-gray-700">{shop.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Products</h2>
          
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search products in this shop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={category === '' ? 'default' : 'outline'}
              onClick={() => setCategory('')}
              size="sm"
            >
              All
            </Button>
            {Object.values(ProductCategory).map((cat) => (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                onClick={() => setCategory(cat)}
                size="sm"
              >
                {cat.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {search || category
                  ? 'No products found matching your filters'
                  : 'This shop has no products yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => {
              const minPrice = Math.min(...product.pricingUnits.map((u) => u.price))
              const primaryUnit = product.pricingUnits[0]

              return (
                <Link key={product.id} href={`/market/product/${product.id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                    <div className="aspect-square bg-gray-200 rounded-t-lg overflow-hidden">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                    </div>
                    <CardHeader>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <CardDescription>
                        {product.category.replace('_', ' ')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          {formatCurrency(minPrice)}
                        </span>
                        <span className="text-sm text-gray-500">
                          /{primaryUnit?.unit}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Customer Reviews</h2>
            {shop.totalReviews > 0 && (
              <span className="text-gray-600">
                ({shop.totalReviews} {shop.totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </div>

          {loadingReviews ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </CardContent>
            </Card>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reviews yet. Be the first to review this shop!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {review.buyer.image ? (
                          <img
                            src={review.buyer.image}
                            alt={review.buyer.name || 'Customer'}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-primary font-semibold">
                              {(review.buyer.name || review.buyer.email || 'C')[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold">
                              {review.buyer.name || 'Anonymous Customer'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <Star
                                key={rating}
                                className={`h-4 w-4 ${
                                  review.rating >= rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 mt-2">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Shop Location Map */}
          {shop.latitude && shop.longitude && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">Shop Location</h2>
              <ShopMap
                latitude={shop.latitude}
                longitude={shop.longitude}
                shopName={shop.name}
                address={shop.address || undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
