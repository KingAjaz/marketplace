'use client'

import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatCurrency, calculatePlatformFee } from '@/lib/utils'
import { Trash2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getTotal, clearCart } = useCart()
  const router = useRouter()

  const subtotal = getTotal()
  const platformFee = calculatePlatformFee(subtotal)
  const deliveryFee = 500 // Fixed delivery fee (can be made dynamic)
  const total = subtotal + platformFee + deliveryFee

  const handleCheckout = () => {
    if (items.length === 0) return
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
              <Link href="/market">
                <Button>Browse Products</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Group items by shop
  const itemsByShop = items.reduce((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = {
        shopName: item.shopName,
        items: [],
      }
    }
    acc[item.shopId].items.push(item)
    return acc
  }, {} as Record<string, { shopName: string; items: typeof items }>)

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Shopping Cart</h1>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            {Object.entries(itemsByShop).map(([shopId, shopData]) => (
              <Card key={shopId}>
                <CardHeader>
                  <CardTitle className="text-lg">{shopData.shopName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {shopData.items.map((item) => (
                    <div key={item.pricingUnitId} className="flex gap-3 sm:gap-4 pb-4 border-b last:border-0">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.productName}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {formatCurrency(item.price)} / {item.unit}
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                              onClick={() => updateQuantity(item.pricingUnitId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <span className="w-10 sm:w-12 text-center font-medium">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 sm:h-8 sm:w-8 touch-manipulation"
                              onClick={() => updateQuantity(item.pricingUnitId, item.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                          <span className="font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 sm:h-8 sm:w-8 ml-auto touch-manipulation"
                            onClick={() => removeFromCart(item.pricingUnitId)}
                          >
                            <Trash2 className="h-4 w-4 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
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
                <div className="flex justify-between">
                  <div>
                    <span>Delivery Fee</span>
                    <span className="text-xs text-gray-500 ml-2">(estimated)</span>
                  </div>
                  <span>{formatCurrency(deliveryFee)}</span>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Final delivery fee will be calculated based on distance from shop to your delivery address at checkout
                </p>
                <div className="border-t pt-4 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <Button className="w-full" size="lg" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
