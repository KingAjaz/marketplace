'use client'

/**
 * Wishlist Hook
 * 
 * Manages wishlist state and operations
 */
import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { useToast } from './use-toast'

interface WishlistItem {
  id: string
  productId: string
  createdAt: string
  product: {
    id: string
    name: string
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
}

export function useWishlist() {
  const { data: session } = useSession()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (session?.user) {
      fetchWishlist()
    } else {
      setItems([])
      setLoading(false)
    }
  }, [session])

  const fetchWishlist = async () => {
    if (!session?.user) return

    setLoading(true)
    try {
      const response = await fetch('/api/wishlist')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const isInWishlist = async (productId: string): Promise<boolean> => {
    if (!user) return false

    try {
      const response = await fetch(`/api/wishlist/check?productId=${productId}`)
      if (response.ok) {
        const data = await response.json()
        return data.isInWishlist || false
      }
    } catch (error) {
      console.error('Failed to check wishlist:', error)
    }
    return false
  }

  const addToWishlist = async (productId: string) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please log in to add items to your wishlist',
        variant: 'destructive',
      })
      return false
    }

    try {
      const response = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      })

      if (response.ok) {
        toast({
          title: 'Added to Wishlist',
          description: 'Product added to your wishlist',
          variant: 'success',
        })
        fetchWishlist() // Refresh wishlist
        return true
      } else {
        const data = await response.json()
        toast({
          title: 'Failed to Add',
          description: data.error || 'Failed to add product to wishlist',
          variant: 'destructive',
        })
        return false
      }
    } catch (error) {
      console.error('Failed to add to wishlist:', error)
      toast({
        title: 'Failed to Add',
        description: 'Failed to add product to wishlist',
        variant: 'destructive',
      })
      return false
    }
  }

  const removeFromWishlist = async (productId: string) => {
    if (!user) return false

    try {
      const response = await fetch(`/api/wishlist?productId=${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: 'Removed from Wishlist',
          description: 'Product removed from your wishlist',
          variant: 'success',
        })
        fetchWishlist() // Refresh wishlist
        return true
      } else {
        const data = await response.json()
        toast({
          title: 'Failed to Remove',
          description: data.error || 'Failed to remove product from wishlist',
          variant: 'destructive',
        })
        return false
      }
    } catch (error) {
      console.error('Failed to remove from wishlist:', error)
      toast({
        title: 'Failed to Remove',
        description: 'Failed to remove product from wishlist',
        variant: 'destructive',
      })
      return false
    }
  }

  const toggleWishlist = async (productId: string) => {
    const currentItem = items.find((item) => item.productId === productId)
    if (currentItem) {
      return await removeFromWishlist(productId)
    } else {
      return await addToWishlist(productId)
    }
  }

  return {
    items,
    loading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    refreshWishlist: fetchWishlist,
  }
}
