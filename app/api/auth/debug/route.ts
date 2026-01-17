/**
 * NextAuth Debug API
 * 
 * This route helps diagnose OAuth configuration issues
 * Remove this in production after debugging
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'unknown'
  const callbackUrl = `${baseUrl}/api/auth/callback/google`
  
  return NextResponse.json({
    environment: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (hidden)' : 'NOT SET',
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
    },
    expectedCallbackUrl: callbackUrl,
    requestOrigin: request.headers.get('origin'),
    requestHost: request.headers.get('host'),
    instructions: {
      step1: 'Set NEXTAUTH_URL in Vercel environment variables to match your domain',
      step2: `Add this exact redirect URI to Google Cloud Console: ${callbackUrl}`,
      step3: 'Ensure there are no trailing slashes in NEXTAUTH_URL',
      step4: 'Redeploy after updating environment variables',
    },
  })
}
