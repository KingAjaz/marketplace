'use client'

/**
 * Advanced Search Page
 * 
 * Enhanced search with multiple filters
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { ProductCategory } from '@prisma/client'
import { Search, Filter, X } from 'lucide-react'
import Link from 'next/link'

interface Product {
  id: string
  name: string
  description: string | null
  category: ProductCategory
  images: string[]
  shop: {
    id: string
    name: string
    rating: number
  }
  pricingUnits: {
    id: string
    unit: string
    price: number
  }[]
}

export default function AdvancedSearchPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: 'newest',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    performSearch()
  }, [filters, page])

  const performSearch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.category) params.append('category', filters.category)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)
      if (filters.minRating) params.append('minRating', filters.minRating)
      params.append('sortBy', filters.sortBy)
      params.append('page', page.toString())
      params.append('limit', '20')

      const response = await fetch(`/api/products/search?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
      sortBy: 'newest',
    })
    setPage(1)
  }

  const hasActiveFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.minRating

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Advanced Search</h1>
          <p className="text-gray-600">Find products with advanced filters</p>
        </div>

        {/* Mobile Filter Toggle */}
        <div className="md:hidden mb-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="w-full"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
            {hasActiveFilters && (
              <span className="ml-2 bg-primary text-white rounded-full px-2 py-0.5 text-xs">
                {[filters.search, filters.category, filters.minPrice, filters.maxPrice, filters.minRating].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`md:col-span-1 ${showFilters ? 'block' : 'hidden md:block'}`}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filters
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <Input
                    id="search"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Product name..."
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">All Categories</option>
                    {Object.values(ProductCategory).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="minPrice">Min Price (₦)</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    placeholder="0"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="maxPrice">Max Price (₦)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    placeholder="No limit"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="minRating">Minimum Shop Rating</Label>
                  <select
                    id="minRating"
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Any Rating</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                    <option value="1">1+ Stars</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="sortBy">Sort By</Label>
                  <select
                    id="sortBy"
                    value={filters.sortBy}
                    onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="name">Name: A to Z</option>
                    <option value="rating">Highest Rated</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="md:col-span-3">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-600">Searching...</p>
                </CardContent>
              </Card>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No products found</p>
                  <p className="text-sm text-gray-500 mt-2">Try adjusting your filters</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-gray-600">
                    Found {products.length} product{products.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="name">Name: A to Z</option>
                      <option value="rating">Highest Rated</option>
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                          <CardHeader>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            <p className="text-sm text-gray-500">{product.shop.name}</p>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-primary">
                                {formatCurrency(minPrice)}
                              </span>
                              <span className="text-sm text-gray-500">/{primaryUnit?.unit}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
