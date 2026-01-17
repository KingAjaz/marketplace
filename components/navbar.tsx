'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/hooks/use-cart'
import { useWishlist } from '@/hooks/use-wishlist'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ShoppingCart, User, Store, Package, Shield, MapPin, Heart, Menu, X } from 'lucide-react'
import NotificationsDropdown from '@/components/notifications-dropdown'

export function Navbar() {
  const { user, status } = useAuth()
  const router = useRouter()
  const { getItemCount } = useCart()
  const { items } = useWishlist()
  const cartCount = getItemCount()
  const wishlistCount = items.length
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const hasRole = (role: string) => {
    return user?.roles?.includes(role as any)
  }

  const handleSignOut = async () => {
    setMobileMenuOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/signin')
    router.refresh()
  }

  const session = user ? { user } : null

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-primary">
            Marketplace
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4">
            <Link href="/market">
              <Button variant="ghost" className="hidden lg:inline-flex">Market</Button>
            </Link>
            <Link href="/market/search">
              <Button variant="ghost" size="sm" className="hidden lg:inline-flex">Search</Button>
            </Link>

            {session ? (
              <>
                <NotificationsDropdown />

                {session && (
                  <Link href="/wishlist" className="relative">
                    <Button variant="ghost" size="icon">
                      <Heart className="h-5 w-5" />
                      {wishlistCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {wishlistCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}

                <Link href="/cart" className="relative">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>

                {hasRole('SELLER') ? (
                  <Link href="/seller/dashboard">
                    <Button variant="ghost" size="icon" title="Seller Dashboard">
                      <Store className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/seller/apply">
                    <Button variant="ghost" size="sm" className="hidden xl:inline-flex">
                      Become a Seller
                    </Button>
                  </Link>
                )}

                {hasRole('RIDER') && (
                  <Link href="/rider/dashboard">
                    <Button variant="ghost" size="icon" title="Rider Dashboard">
                      <Package className="h-5 w-5" />
                    </Button>
                  </Link>
                )}

                {hasRole('ADMIN') && (
                  <Link href="/admin/dashboard">
                    <Button variant="ghost" size="icon" title="Admin Dashboard">
                      <Shield className="h-5 w-5" />
                    </Button>
                  </Link>
                )}

                <Link href="/account/addresses">
                  <Button variant="ghost" size="icon" title="My Addresses">
                    <MapPin className="h-5 w-5" />
                  </Button>
                </Link>

                <Link href="/account/settings">
                  <Button variant="ghost" size="icon" title="Account Settings">
                    <User className="h-5 w-5" />
                  </Button>
                </Link>

                <Button variant="ghost" onClick={handleSignOut} size="sm" className="hidden lg:inline-flex">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button & Essential Icons */}
          <div className="flex md:hidden items-center gap-2">
            {session && (
              <>
                <Link href="/cart" className="relative">
                  <Button variant="ghost" size="icon">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <NotificationsDropdown />
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-2">
            <Link href="/market" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Market
              </Button>
            </Link>
            <Link href="/market/search" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start">
                Search
              </Button>
            </Link>

            {session ? (
              <>
                {session && (
                  <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Heart className="h-4 w-4 mr-2" />
                      Wishlist
                      {wishlistCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                          {wishlistCount}
                        </span>
                      )}
                    </Button>
                  </Link>
                )}

                {hasRole('SELLER') ? (
                  <Link href="/seller/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Store className="h-4 w-4 mr-2" />
                      Seller Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/seller/apply" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      Become a Seller
                    </Button>
                  </Link>
                )}

                {hasRole('RIDER') && (
                  <Link href="/rider/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Package className="h-4 w-4 mr-2" />
                      Rider Dashboard
                    </Button>
                  </Link>
                )}

                {hasRole('ADMIN') && (
                  <Link href="/admin/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </Button>
                  </Link>
                )}

                <Link href="/account/addresses" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <MapPin className="h-4 w-4 mr-2" />
                    My Addresses
                  </Button>
                </Link>

                <Link href="/account/settings" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Account Settings
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start"
                >
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-start">Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
