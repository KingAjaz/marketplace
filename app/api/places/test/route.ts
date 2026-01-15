/**
 * Google Places API Test Endpoint
 * 
 * Tests if Google Places API is properly configured and working
 * This endpoint can be used to verify API key setup
 */
import { NextRequest, NextResponse } from 'next/server'

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json({
        configured: false,
        error: 'GOOGLE_PLACES_API_KEY is not set in environment variables',
        message: 'Please add GOOGLE_PLACES_API_KEY to your .env file',
      }, { status: 500 })
    }

    // Test with a simple query (Lagos, Nigeria)
    const testQuery = 'Lagos, Nigeria'
    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
    url.searchParams.set('input', testQuery)
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY)
    url.searchParams.set('components', 'country:ng')

    const response = await fetch(url.toString())
    const data = await response.json()

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return NextResponse.json({
        configured: true,
        working: true,
        status: data.status,
        predictionsCount: data.predictions?.length || 0,
        message: 'Google Places API is properly configured and working',
        testQuery,
        samplePredictions: data.predictions?.slice(0, 3).map((p: any) => ({
          description: p.description,
          placeId: p.place_id,
        })) || [],
      })
    } else {
      return NextResponse.json({
        configured: true,
        working: false,
        status: data.status,
        error: data.error_message || 'Unknown error',
        message: 'Google Places API key is configured but returned an error',
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({
      configured: !!GOOGLE_PLACES_API_KEY,
      working: false,
      error: error.message || 'Failed to test Google Places API',
      message: 'Error occurred while testing Google Places API',
    }, { status: 500 })
  }
}
