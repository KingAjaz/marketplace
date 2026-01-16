'use client'

/**
 * Market Page - Shows all active shops/stores
 * Users can browse shops and click into them to see products
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Store, Star, MapPin, Package } from 'lucide-react'
import { formatDistance } from '@/lib/distance'
import { useSession } from 'next-auth/react'

interface Shop {
  id: string
  name: string
  description: string | null
  logo: string | null
  banner: string | null
  address: string | null
  city: string | null
  state: string | null
  rating: number
  totalReviews: number
  productCount: number
  distance?: number | null
}

export default function MarketPage() {
  const { data: session } = useSession()
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Fetch user's default address location on mount
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserLocation()
    }
  }, [session])

  // Fetch shops on mount and when search changes
  // Don't wait for user location - fetch immediately
  useEffect(() => {
    // Always fetch on mount, then debounce search
    if (!search) {
      fetchShops()
    } else {
      const timeoutId = setTimeout(() => {
        fetchShops()
      }, 500) // Wait 500ms after user stops typing
      return () => clearTimeout(timeoutId)
    }
  }, [search])

  // Also fetch when user location becomes available (for sorting)
  useEffect(() => {
    if (userLocation) {
      // Re-fetch to get distance-based sorting
      fetchShops()
    }
  }, [userLocation])

  const fetchUserLocation = async () => {
    try {
      const response = await fetch('/api/addresses')
      if (response.ok) {
        const data = await response.json()
        const defaultAddress = data.addresses?.find((a: any) => a.isDefault)
        if (defaultAddress?.latitude && defaultAddress?.longitude) {
          setUserLocation({
            lat: defaultAddress.latitude,
            lng: defaultAddress.longitude,
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch user location:', error)
    }
  }

  const fetchShops = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (userLocation) {
        params.append('lat', userLocation.lat.toString())
        params.append('lng', userLocation.lng.toString())
      }

      console.log('[Market] Fetching shops with params:', params.toString())
      const response = await fetch(`/api/shops?${params.toString()}`)
      const data = await response.json()
      
      console.log('[Market] Response status:', response.status)
      console.log('[Market] Received shops:', data.shops?.length || 0)
      
      if (!response.ok) {
        console.error('[Market] API error:', data.error || data.details)
      }
      
      setShops(data.shops || [])
    } catch (error) {
      console.error('[Market] Failed to fetch shops:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchShops()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Marketplace</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
            Browse shops and discover fresh products from local sellers
            {userLocation && (
              <span className="block sm:inline sm:ml-2 text-xs sm:text-sm text-primary mt-1 sm:mt-0">
                • Showing nearest shops first
              </span>
            )}
          </p>
          
          <form onSubmit={handleSearch} className="flex gap-2 sm:gap-4 mb-6">
            <Input
              type="text"
              placeholder="Search shops..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button type="submit" className="flex-shrink-0">
              <Search className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Search</span>
            </Button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shops...</p>
          </div>
        ) : shops.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {search ? 'No shops found matching your search' : 'No shops available yet'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            {shops.map((shop) => (
              <Link key={shop.id} href={`/market/shop/${shop.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
                  {/* Shop Banner/Logo */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                    {shop.banner ? (
                      <img
                        src={shop.banner}
                        alt={shop.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Store className="h-16 w-16 text-primary/30" />
                      </div>
                    )}
                    {shop.logo && (
                      <div className="absolute bottom-0 left-4 transform translate-y-1/2">
                        <div className="w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow-lg">
                          <img
                            src={shop.logo}
                            alt={`${shop.name} logo`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <CardHeader className="pt-12">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{shop.name}</CardTitle>
                        {shop.city && shop.state && (
                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                            <MapPin className="h-3 w-3" />
                            <span>
                              {shop.city}, {shop.state}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {shop.description && (
                      <CardDescription className="line-clamp-2 mt-2">
                        {shop.description}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="mt-auto">
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium">
                            {shop.rating > 0 ? shop.rating.toFixed(1) : 'New'}
                          </span>
                          {shop.totalReviews > 0 && (
                            <span className="text-xs text-gray-500">
                              ({shop.totalReviews})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Package className="h-4 w-4" />
                          <span>{shop.productCount} products</span>
                        </div>
                        {shop.distance != null && (
                          <div className="flex items-center gap-1 text-sm text-primary font-medium">
                            <MapPin className="h-3 w-3" />
                            <span>{formatDistance(shop.distance)}</span>
                          </div>
                        )}
                      </div>
                      <Button variant="outline" size="sm">
                        View Shop
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
