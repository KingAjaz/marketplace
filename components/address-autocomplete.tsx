'use client'

/**
 * Address Autocomplete Component
 * 
 * Provides Google Places autocomplete functionality with debouncing
 * Fetches place details (including coordinates) when user selects an address
 */
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, MapPin } from 'lucide-react'

interface PlacePrediction {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

interface PlaceDetails {
  formattedAddress: string
  latitude: number | null
  longitude: number | null
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (details: PlaceDetails) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  locationBias?: { lat: number; lng: number } // Optional location for biasing results
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address...',
  className = '',
  disabled = false,
  locationBias,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch autocomplete suggestions
  const fetchSuggestions = async (input: string) => {
    if (input.length < 2) {
      setPredictions([])
      setShowSuggestions(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ input })
      if (locationBias) {
        params.append('location', `${locationBias.lat},${locationBias.lng}`)
      }

      const response = await fetch(`/api/places/autocomplete?${params.toString()}`)
      const data = await response.json()

      if (response.ok && data.predictions) {
        setPredictions(data.predictions)
        setShowSuggestions(true)
      } else {
        // Handle API errors gracefully
        if (data.error) {
          console.warn('Places API error:', data.error)
          // Log specific error for debugging
          if (data.error.includes('not configured') || data.error.includes('API key')) {
            console.error('Google Places API key is missing or invalid. Please configure GOOGLE_PLACES_API_KEY in your .env file')
          }
          // Don't show error to user - just hide suggestions
          // User can still type address manually
        }
        setPredictions([])
        setShowSuggestions(false)
      }
    } catch (error) {
      console.error('Failed to fetch autocomplete suggestions:', error)
      // Silently fail - user can still enter address manually
      setPredictions([])
      setShowSuggestions(false)
    } finally {
      setLoading(false)
    }
  }

  // Debounced input handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If user is typing (not selecting), fetch suggestions
    if (!selectedPlaceId) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(newValue)
      }, 300) // 300ms debounce
    } else {
      // Reset selection if user starts typing again
      setSelectedPlaceId(null)
    }
  }

  // Handle place selection
  const handlePlaceSelect = async (prediction: PlacePrediction) => {
    setSelectedPlaceId(prediction.placeId)
    onChange(prediction.description)
    setShowSuggestions(false)
    setPredictions([])

    // Fetch place details including coordinates
    try {
      const response = await fetch(`/api/places/details?placeId=${prediction.placeId}`)
      const data = await response.json()

      if (response.ok && data.formattedAddress) {
        // Call onSelect callback with full details
        if (onSelect) {
          onSelect({
            formattedAddress: data.formattedAddress,
            latitude: data.latitude,
            longitude: data.longitude,
            street: data.street || '',
            city: data.city || '',
            state: data.state || '',
            postalCode: data.postalCode || '',
            country: data.country || 'Nigeria',
          })
        }
      } else {
        // If place details fetch fails, still allow manual entry
        // The address text is already set from the prediction
        console.warn('Failed to fetch place details:', data.error || 'Unknown error')
        // User can still proceed with manual address entry
      }
    } catch (error) {
      console.error('Failed to fetch place details:', error)
      // Silently fail - user can still enter address manually
    }
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <MapPin className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && predictions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handlePlaceSelect(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {prediction.mainText}
                  </div>
                  {prediction.secondaryText && (
                    <div className="text-xs text-gray-500 truncate">
                      {prediction.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
