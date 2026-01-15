'use client'

/**
 * Shop Location Map Component
 * 
 * Displays shop location on Google Maps
 */
import { useEffect, useRef } from 'react'

interface ShopMapProps {
  latitude: number
  longitude: number
  shopName: string
  address?: string
  className?: string
}

export default function ShopMap({ latitude, longitude, shopName, address, className = '' }: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current || !latitude || !longitude) return

    // Load Google Maps script
    const script = document.createElement('script')
    // Get API key from environment or use the same key as Places API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google && mapRef.current) {
        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: latitude, lng: longitude },
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
        })

        new window.google.maps.Marker({
          position: { lat: latitude, lng: longitude },
          map,
          title: shopName,
        })
      }
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [latitude, longitude, shopName])

  if (!latitude || !longitude) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height: '300px' }}>
        <p className="text-gray-500">Location not available</p>
      </div>
    )
  }

  return (
    <div
      ref={mapRef}
      className={`rounded-lg overflow-hidden ${className}`}
      style={{ height: '300px', minHeight: '300px' }}
    />
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any
  }
}
