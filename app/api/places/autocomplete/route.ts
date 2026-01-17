/**
 * Google Places Autocomplete API (Server-Side)
 * 
 * This route handles Google Places Autocomplete requests server-side
 * to keep the API key secure. Never expose Google API keys on the client.
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const input = searchParams.get('input')
    const location = searchParams.get('location') // Optional: "lat,lng" for location bias

    if (!input || input.trim().length < 2) {
      return NextResponse.json(
        { error: 'Input query must be at least 2 characters' },
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

    // Build Google Places Autocomplete API URL
    // Restrict to Nigeria for this marketplace
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', input)
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    url.searchParams.set('components', 'country:ng') // Restrict to Nigeria
    
    // Add location bias if provided (helps prioritize nearby results)
    if (location) {
      url.searchParams.set('location', location)
      url.searchParams.set('radius', '50000') // 50km radius
    }

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message)
      return NextResponse.json(
        { error: data.error_message || 'Failed to fetch places' },
        { status: 500 }
      )
    }

    // Format predictions for client
    const predictions = (data.predictions || []).map((prediction: any) => ({
      placeId: prediction.place_id,
      description: prediction.description,
      mainText: prediction.structured_formatting?.main_text || '',
      secondaryText: prediction.structured_formatting?.secondary_text || '',
    }))

    return NextResponse.json({ predictions })
  } catch (error: any) {
    console.error('Places autocomplete error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch autocomplete suggestions' },
      { status: 500 }
    )
  }
}
