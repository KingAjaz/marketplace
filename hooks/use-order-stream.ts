'use client'

/**
 * Hook for real-time order updates via Server-Sent Events
 */
import { useEffect, useRef, useState } from 'react'

interface OrderUpdate {
  type: 'connected' | 'order_status_update' | 'delivery_status_update' | 'rider_location_update' | 'error'
  orderId?: string
  status?: string
  deliveryId?: string
  latitude?: number
  longitude?: number
  rider?: {
    id: string
    name: string | null
    phoneNumber: string | null
  } | null
  pickedUpAt?: string | null
  deliveredAt?: string | null
  order?: {
    id: string
    orderNumber: string
    status: string
    deliveredAt: string | null
  }
  message?: string
}

interface UseOrderStreamOptions {
  orderId: string
  enabled?: boolean
  onUpdate?: (update: OrderUpdate) => void
}

export function useOrderStream({ orderId, enabled = true, onUpdate }: UseOrderStreamOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<OrderUpdate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!enabled || !orderId) {
      return
    }

    // Create EventSource connection
    const eventSource = new EventSource(`/api/orders/${orderId}/stream`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      setError(null)
    }

    eventSource.onmessage = (event) => {
      try {
        const update: OrderUpdate = JSON.parse(event.data)
        setLastUpdate(update)
        
        if (onUpdate) {
          onUpdate(update)
        }
      } catch (err) {
        console.error('Failed to parse SSE message:', err)
      }
    }

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err)
      setError('Connection error')
      setIsConnected(false)
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close()
          eventSourceRef.current = null
        }
      }, 3000)
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
      setIsConnected(false)
    }
  }, [orderId, enabled, onUpdate])

  return {
    isConnected,
    lastUpdate,
    error,
  }
}
