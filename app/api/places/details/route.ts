/**
 * Google Places Details API (Server-Side)
 * 
 * Fetches detailed information about a place including coordinates
 * This is called after user selects an address from autocomplete
 */
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const placeId = searchParams.get('placeId')

    if (!placeId) {
      return NextResponse.json(
        { error: 'Place ID is required' },
        { status: 400 }
      )
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.error('Google Places API key is not configured')
      console.error('Please add GOOGLE_PLACES_API_KEY to your .env file')
      return NextResponse.json(
        { 
          error: 'Places API not configured',
          message: 'Google Places API key is missing. Please configure GOOGLE_PLACES_API_KEY in your environment variables.',
          configured: false
        },
        { status: 500 }
      )
    }

    // Build Google Places Details API URL
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
    url.searchParams.set('place_id', placeId)
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    url.searchParams.set('fields', 'formatted_address,geometry,address_components')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK') {
      console.error('Google Places Details API error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch place details' },
        { status: 500 }
      )
    }

    const result = data.result
    const location = result.geometry?.location

    // Parse address components
    const addressComponents = result.address_components || []
    const getComponent = (type: string) => {
      const component = addressComponents.find((c: any) => c.types.includes(type))
      return component?.long_name || ''
    }

    return NextResponse.json({
      formattedAddress: result.formatted_address,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      street: (getComponent('street_number') + ' ' + getComponent('route')).trim() || getComponent('route'),
      city: getComponent('locality') || getComponent('administrative_area_level_2') || getComponent('sublocality'),
      state: getComponent('administrative_area_level_1'),
      postalCode: getComponent('postal_code'),
      country: getComponent('country') || 'Nigeria',
    })
  } catch (error: any) {
    console.error('Places details error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch place details' },
      { status: 500 }
    )
  }
}
