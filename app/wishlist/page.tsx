'use client'

/**
 * Wishlist Page
 * 
 * Displays user's saved products
 */
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Heart, ShoppingCart, Star, Store, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useWishlist } from '@/hooks/use-wishlist'
import { useCart } from '@/hooks/use-cart'

export default function WishlistPage() {
  const { user, status } = useAuth()
  const router = useRouter()
  const { items, loading, removeFromWishlist, refreshWishlist } = useWishlist()
  const { addToCart } = useCart()
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleRemove = async (productId: string) => {
    setRemovingIds(prev => new Set(prev).add(productId))
    await removeFromWishlist(productId)
    setRemovingIds(prev => {
      const newSet = new Set(prev)
      newSet.delete(productId)
      return newSet
    })
  }

  const handleAddToCart = (item: any) => {
    const product = item.product
    const primaryUnit = product.pricingUnits[0]
    
    if (!primaryUnit) return

    addToCart({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      pricingUnitId: primaryUnit.id,
      unit: primaryUnit.unit,
      price: primaryUnit.price,
      quantity: 1,
      shopId: product.shop.id,
      shopName: product.shop.name,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading wishlist...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link href="/market">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Market
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            <h1 className="text-3xl font-bold">My Wishlist</h1>
          </div>
          <p className="text-gray-600">
            {items.length === 0
              ? 'Save your favorite products here'
              : `${items.length} ${items.length === 1 ? 'item' : 'items'} saved`}
          </p>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
              <p className="text-gray-600 mb-6">
                Start saving your favorite products by clicking the heart icon
              </p>
              <Link href="/market">
                <Button>
                  Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {items.map((item) => {
              const product = item.product
              const minPrice = Math.min(...product.pricingUnits.map((u: any) => u.price))
              const primaryUnit = product.pricingUnits[0]
              const isRemoving = removingIds.has(product.id)

              return (
                <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/market/product/${product.id}`}>
                    <div className="aspect-square bg-gray-200 overflow-hidden relative group">
                      {product.images[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No image
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.preventDefault()
                          handleRemove(product.id)
                        }}
                        disabled={isRemoving}
                      >
                        {isRemoving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                          <Heart className="h-5 w-5 fill-current" />
                        )}
                      </Button>
                    </div>
                  </Link>
                  <CardHeader>
                    <Link href={`/market/product/${product.id}`}>
                      <CardTitle className="text-lg hover:text-primary transition-colors">
                        {product.name}
                      </CardTitle>
                    </Link>
                    <CardDescription className="flex items-center gap-2 text-sm">
                      <Store className="h-3 w-3" />
                      <span>{product.shop.name}</span>
                      {product.shop.totalReviews > 0 && (
                        <>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {product.shop.rating.toFixed(1)}
                          </span>
                        </>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-primary">
                        {formatCurrency(minPrice)}
                      </span>
                      {primaryUnit && (
                        <span className="text-sm text-gray-500">
                          /{primaryUnit.unit}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Link href={`/market/product/${product.id}`} className="flex-1">
                        <Button variant="outline" className="w-full" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        className="flex-1"
                        size="sm"
                        onClick={() => handleAddToCart(item)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
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
