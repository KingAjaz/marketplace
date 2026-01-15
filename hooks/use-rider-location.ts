'use client'

/**
 * Hook for tracking and updating rider location
 * 
 * Automatically updates rider location for active deliveries
 */
import { useEffect, useRef, useState } from 'react'

interface UseRiderLocationOptions {
  enabled?: boolean
  deliveryId?: string
  updateInterval?: number // in milliseconds
}

export function useRiderLocation({ enabled = true, deliveryId, updateInterval = 5000 }: UseRiderLocationOptions) {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!enabled || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    // Get initial location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setError(null)
      },
      (err) => {
        setError(`Failed to get location: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // Watch position changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setLocation(newLocation)
        setError(null)
      },
      (err) => {
        setError(`Location tracking error: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )

    // Update location on server at intervals
    if (deliveryId) {
      intervalRef.current = setInterval(async () => {
        if (location) {
          setIsUpdating(true)
          try {
            const response = await fetch('/api/rider/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                latitude: location.latitude,
                longitude: location.longitude,
                deliveryId,
              }),
            })

            if (!response.ok) {
              console.error('Failed to update rider location')
            }
          } catch (err) {
            console.error('Error updating rider location:', err)
          } finally {
            setIsUpdating(false)
          }
        }
      }, updateInterval)
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, deliveryId, updateInterval, location])

  return {
    location,
    error,
    isUpdating,
  }
}
