'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

const errorMessages: { [key: string]: { title: string; message: string } } = {
  Configuration: {
    title: 'Configuration Error',
    message: 'There is a problem with the server configuration. Please contact support.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'You do not have permission to sign in.',
  },
  Verification: {
    title: 'Verification Error',
    message: 'The verification token has expired or has already been used.',
  },
  Callback: {
    title: 'OAuth Callback Error',
    message: 'There was an error with the OAuth callback. This usually means the redirect URI in Google Cloud Console does not match your application URL. Please ensure your Google OAuth redirect URI is set to: https://your-domain.vercel.app/api/auth/callback/google',
  },
  OAuthSignin: {
    title: 'OAuth Sign In Error',
    message: 'Error in constructing an authorization URL.',
  },
  OAuthCallback: {
    title: 'OAuth Callback Error',
    message: 'Error in handling the response from an OAuth provider.',
  },
  OAuthCreateAccount: {
    title: 'Account Creation Error',
    message: 'Could not create OAuth account in the database.',
  },
  EmailCreateAccount: {
    title: 'Account Creation Error',
    message: 'Could not create email account in the database.',
  },
  OAuthAccountNotLinked: {
    title: 'Account Not Linked',
    message: 'To confirm your identity, sign in with the same account you used originally.',
  },
  EmailSignin: {
    title: 'Email Error',
    message: 'The e-mail could not be sent.',
  },
  CredentialsSignin: {
    title: 'Sign In Error',
    message: 'The credentials you provided are incorrect.',
  },
  SessionRequired: {
    title: 'Session Required',
    message: 'Please sign in to access this page.',
  },
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || 'Unknown'
  const errorInfo = errorMessages[error] || {
    title: 'Authentication Error',
    message: `An unexpected error occurred: ${error}`,
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-center">{errorInfo.title}</CardTitle>
          <CardDescription className="text-center mt-2">
            {errorInfo.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === 'Callback' && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded text-sm space-y-3">
              <p className="font-semibold mb-2">Common causes and solutions:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li className="mb-2">
                  <strong>Verify Google Console redirect URI:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                    <li>Navigate to APIs & Services → Credentials</li>
                    <li>Click on your OAuth 2.0 Client ID</li>
                    <li>Ensure this redirect URI is added: <code className="bg-yellow-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}/api/auth/callback/google</code></li>
                    <li>Save and wait a few minutes for changes to propagate</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <strong>Verify Vercel environment variables:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li><code className="bg-yellow-100 px-1 rounded">NEXTAUTH_URL</code> = <code className="bg-yellow-100 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.vercel.app'}</code> (no trailing slash)</li>
                    <li><code className="bg-yellow-100 px-1 rounded">NEXTAUTH_SECRET</code> is set</li>
                    <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_CLIENT_ID</code> matches your Google Console Client ID</li>
                    <li><code className="bg-yellow-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> matches your Google Console Client Secret</li>
                  </ul>
                </li>
                <li className="mb-2">
                  <strong>After updating:</strong>
                  <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                    <li>Redeploy your Vercel application to pick up new environment variables</li>
                    <li>Clear your browser cache and cookies</li>
                    <li>Try signing in again</li>
                  </ul>
                </li>
              </ol>
              <div className="bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2 rounded mt-3 text-xs">
                <strong>Note:</strong> If you're using a custom domain, make sure to add BOTH the Vercel URL and your custom domain to the redirect URIs in Google Console.
              </div>
            </div>
          )}
          <div className="flex gap-4">
            <Button asChild className="flex-1">
              <Link href="/auth/signin">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
