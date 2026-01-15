'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingBag, Truck, Shield, Star } from 'lucide-react'
import { RiceAnimate } from '@/components/riceanimate'

interface CategoryCardProps {
  category: {
    name: string
    description: string
    image: string
    fallbackColor: string
  }
}

function CategoryCard({ category }: CategoryCardProps) {
  const [imageError, setImageError] = useState(false)
  
  return (
    <Link href="/market">
      <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group h-full">
        <div className={`relative aspect-video w-full overflow-hidden ${imageError ? category.fallbackColor : 'bg-gray-200'} flex items-center justify-center`}>
          {imageError ? (
            <div className="text-4xl font-bold text-gray-600">{category.name.charAt(0)}</div>
          ) : (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              onError={() => {
                console.error(`Failed to load image for ${category.name}:`, category.image)
                setImageError(true)
              }}
              loading="lazy"
            />
          )}
        </div>
        <CardHeader>
          <CardTitle className="text-center">{category.name}</CardTitle>
          <CardDescription className="text-center">{category.description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Scrollytelling Hero Section */}
      <div className="relative">
        <RiceAnimate 
          frameCount={40}
          framePath="/rice animate/ezgif-frame-{INDEX}.jpg"
          scrollHeight="200vh"
        />
        
        {/* Content Overlay - Absolutely positioned over the sticky canvas */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="sticky top-0 h-screen flex items-center justify-center">
            <div className="pointer-events-auto max-w-3xl mx-auto px-4 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 drop-shadow-2xl">
                Fresh Foodstuffs, Delivered Same Day
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 px-2 drop-shadow-lg">
                Your trusted marketplace for fresh foodstuffs, meat, processed foods, and live animals.
                Order from verified sellers and get it delivered today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                <Link href="/market" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 shadow-2xl backdrop-blur-sm">
                    Shop Now
                  </Button>
                </Link>
                <Link href="/seller/apply" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 bg-white/90 backdrop-blur-sm shadow-2xl hover:bg-white border-2">
                    Become a Seller
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <Card>
              <CardHeader>
                <ShoppingBag className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Wide Selection</CardTitle>
                <CardDescription>
                  Browse thousands of fresh products from verified sellers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Truck className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Same-Day Delivery</CardTitle>
                <CardDescription>
                  Get your orders delivered the same day you place them
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Secure Payments</CardTitle>
                <CardDescription>
                  Escrow protection ensures you only pay when satisfied
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Star className="h-12 w-12 text-primary mb-4" />
                <CardTitle>Verified Sellers</CardTitle>
                <CardDescription>
                  All sellers are verified and approved by our team
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-12">Shop by Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { 
                name: 'Foodstuffs', 
                description: 'Fresh produce and grains',
                image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop',
                fallbackColor: 'bg-green-100'
              },
              { 
                name: 'Meat & Protein', 
                description: 'Fresh meat and protein sources',
                image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&h=600&fit=crop',
                fallbackColor: 'bg-red-100'
              },
              { 
                name: 'Live Animals', 
                description: 'Live animals for sale',
                image: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&h=600&fit=crop',
                fallbackColor: 'bg-amber-100'
              },
              { 
                name: 'Processed Foods', 
                description: 'Processed and packaged foods',
                image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&h=600&fit=crop',
                fallbackColor: 'bg-blue-100'
              },
            ].map((category) => (
              <CategoryCard key={category.name} category={category} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
