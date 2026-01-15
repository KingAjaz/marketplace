'use client'

/**
 * Delivery Tracking Map Component
 * 
 * Shows delivery route between shop and delivery address
 * Displays rider location if available
 */
import { useEffect, useRef, useState } from 'react'

interface DeliveryTrackingMapProps {
  shopLatitude: number | null
  shopLongitude: number | null
  shopName: string
  deliveryLatitude: number | null
  deliveryLongitude: number | null
  deliveryAddress: string
  riderLatitude?: number | null
  riderLongitude?: number | null
  riderName?: string | null
  deliveryStatus?: string
  className?: string
}

export default function DeliveryTrackingMap({
  shopLatitude,
  shopLongitude,
  shopName,
  deliveryLatitude,
  deliveryLongitude,
  deliveryAddress,
  riderLatitude,
  riderLongitude,
  riderName,
  deliveryStatus,
  className = '',
}: DeliveryTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [directionsService, setDirectionsService] = useState<any>(null)
  const [directionsRenderer, setDirectionsRenderer] = useState<any>(null)

  useEffect(() => {
    if (!mapRef.current) return

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
    if (!apiKey) {
      console.warn('Google Maps API key not configured')
      return
    }

    // Load Google Maps script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,directions`
    script.async = true
    script.defer = true

    script.onload = () => {
      if (window.google && mapRef.current) {
        // Initialize map
        const map = new window.google.maps.Map(mapRef.current, {
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })

        const bounds = new window.google.maps.LatLngBounds()
        const markers: any[] = []

        // Add shop marker
        if (shopLatitude && shopLongitude) {
          const shopMarker = new window.google.maps.Marker({
            position: { lat: shopLatitude, lng: shopLongitude },
            map,
            title: shopName,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            label: {
              text: 'S',
              color: 'white',
              fontSize: '12px',
            },
          })
          markers.push(shopMarker)
          bounds.extend({ lat: shopLatitude, lng: shopLongitude })

          // Shop info window
          const shopInfoWindow = new window.google.maps.InfoWindow({
            content: `<div class="p-2"><strong>${shopName}</strong><br/>Pickup Location</div>`,
          })
          shopMarker.addListener('click', () => {
            shopInfoWindow.open(map, shopMarker)
          })
        }

        // Add delivery address marker
        if (deliveryLatitude && deliveryLongitude) {
          const deliveryMarker = new window.google.maps.Marker({
            position: { lat: deliveryLatitude, lng: deliveryLongitude },
            map,
            title: deliveryAddress,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ef4444',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            },
            label: {
              text: 'D',
              color: 'white',
              fontSize: '12px',
            },
          })
          markers.push(deliveryMarker)
          bounds.extend({ lat: deliveryLatitude, lng: deliveryLongitude })

          // Delivery info window
          const deliveryInfoWindow = new window.google.maps.InfoWindow({
            content: `<div class="p-2"><strong>Delivery Address</strong><br/>${deliveryAddress}</div>`,
          })
          deliveryMarker.addListener('click', () => {
            deliveryInfoWindow.open(map, deliveryMarker)
          })
        }

        // Add rider location marker if available
        if (riderLatitude && riderLongitude && deliveryStatus === 'IN_TRANSIT') {
          const riderMarker = new window.google.maps.Marker({
            position: { lat: riderLatitude, lng: riderLongitude },
            map,
            title: riderName || 'Rider',
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            label: {
              text: '🚴',
              fontSize: '16px',
            },
            animation: window.google.maps.Animation.BOUNCE,
          })
          markers.push(riderMarker)
          bounds.extend({ lat: riderLatitude, lng: riderLongitude })

          // Rider info window
          const riderInfoWindow = new window.google.maps.InfoWindow({
            content: `<div class="p-2"><strong>${riderName || 'Rider'}</strong><br/>Current Location</div>`,
          })
          riderMarker.addListener('click', () => {
            riderInfoWindow.open(map, riderMarker)
          })
        }

        // Fit bounds to show all markers
        if (markers.length > 0) {
          map.fitBounds(bounds)
          // Add padding
          const padding = 50
          map.fitBounds(bounds, { top: padding, right: padding, bottom: padding, left: padding })
        }

        // Draw route between shop and delivery address
        if (
          shopLatitude &&
          shopLongitude &&
          deliveryLatitude &&
          deliveryLongitude &&
          window.google.maps.DirectionsService &&
          window.google.maps.DirectionsRenderer
        ) {
          const directionsService = new window.google.maps.DirectionsService()
          const directionsRenderer = new window.google.maps.DirectionsRenderer({
            map,
            suppressMarkers: true, // Use our custom markers
            polylineOptions: {
              strokeColor: '#3b82f6',
              strokeWeight: 4,
              strokeOpacity: 0.7,
            },
          })

          directionsService.route(
            {
              origin: { lat: shopLatitude, lng: shopLongitude },
              destination: { lat: deliveryLatitude, lng: deliveryLongitude },
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result: any, status: any) => {
              if (status === 'OK' && result) {
                directionsRenderer.setDirections(result)
              } else {
                console.error('Directions request failed:', status)
              }
            }
          )

          setDirectionsService(directionsService)
          setDirectionsRenderer(directionsRenderer)
        }

        setMapLoaded(true)
      }
    }

    document.head.appendChild(script)

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [
    shopLatitude,
    shopLongitude,
    shopName,
    deliveryLatitude,
    deliveryLongitude,
    deliveryAddress,
    riderLatitude,
    riderLongitude,
    riderName,
    deliveryStatus,
  ])

  // Update rider location if it changes
  useEffect(() => {
    if (!mapLoaded || !riderLatitude || !riderLongitude || !directionsService || !directionsRenderer) {
      return
    }

    // You can update rider marker position here if needed
    // For now, the map will re-render when rider location changes
  }, [riderLatitude, riderLongitude, mapLoaded, directionsService, directionsRenderer])

  if (!shopLatitude || !shopLongitude || !deliveryLatitude || !deliveryLongitude) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`} style={{ height: '400px' }}>
        <div className="text-center">
          <p className="text-gray-500 mb-2">Location data not available</p>
          <p className="text-sm text-gray-400">{deliveryAddress}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-lg overflow-hidden border ${className}`}>
      <div
        ref={mapRef}
        className="w-full"
        style={{ height: '400px', minHeight: '400px' }}
      />
      <div className="bg-white p-3 border-t">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Shop ({shopName})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Delivery</span>
          </div>
          {riderLatitude && riderLongitude && deliveryStatus === 'IN_TRANSIT' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Rider {riderName ? `(${riderName})` : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google: any
  }
}
