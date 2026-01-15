'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Star, Store, Heart } from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useWishlist } from '@/hooks/use-wishlist'
import ProductImageGallery from '@/components/product-image-gallery'

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  images: string[]
  shop: {
    id: string
    name: string
    rating: number
    totalReviews: number
  }
  pricingUnits: {
    id: string
    unit: string
    price: number
    stock: number | null
  }[]
}

export default function ProductPage() {
  const params = useParams()
  const productId = params.id as string
  const { addToCart } = useCart()
  const { toggleWishlist, items } = useWishlist()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [isInWishlist, setIsInWishlist] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  useEffect(() => {
    if (product?.pricingUnits.length) {
      setSelectedUnit(product.pricingUnits[0].id)
    }
  }, [product])

  useEffect(() => {
    if (productId && items.length >= 0) {
      setIsInWishlist(items.some(item => item.productId === productId))
    }
  }, [productId, items])

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/products/${productId}`)
      const data = await response.json()
      setProduct(data.product)
    } catch (error) {
      console.error('Failed to fetch product:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = () => {
    if (!product || !selectedUnit) return

    const unit = product.pricingUnits.find((u) => u.id === selectedUnit)
    if (!unit) return

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      pricingUnitId: selectedUnit,
      unit: unit.unit,
      price: unit.price,
      quantity,
      shopId: product.shop.id,
      shopName: product.shop.name,
    })
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!product) {
    return <div className="min-h-screen flex items-center justify-center">Product not found</div>
  }

  const selectedUnitData = product.pricingUnits.find((u) => u.id === selectedUnit)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <ProductImageGallery images={product.images} productName={product.name} />
          </div>

          {/* Product Details */}
          <div>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <CardTitle className="text-3xl">{product.name}</CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWishlist(product.id)}
                        className={isInWishlist ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}
                      >
                        <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Store className="h-4 w-4" />
                      <span>{product.shop.name}</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        {product.shop.rating.toFixed(1)} ({product.shop.totalReviews})
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {product.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-gray-700">{product.description}</p>
                  </div>
                )}

                <div>
                  <Label className="mb-2 block">Select Unit</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {product.pricingUnits.map((unit) => (
                      <button
                        key={unit.id}
                        onClick={() => setSelectedUnit(unit.id)}
                        className={`p-3 border rounded-lg text-left transition-colors ${
                          selectedUnit === unit.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-semibold">{unit.unit}</div>
                        <div className="text-primary font-bold">{formatCurrency(unit.price)}</div>
                        {unit.stock !== null && (
                          <div className="text-xs text-gray-500 mt-1">
                            {unit.stock > 0 ? `${unit.stock} in stock` : 'Out of stock'}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedUnitData && (
                  <div>
                    <Label htmlFor="quantity" className="mb-2 block">Quantity</Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >
                          -
                        </Button>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQuantity(quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <div className="text-lg font-semibold">
                        Total: {formatCurrency(selectedUnitData.price * quantity)}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!selectedUnit || (selectedUnitData?.stock !== null && selectedUnitData.stock < quantity)}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
