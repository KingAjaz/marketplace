'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useSession } from 'next-auth/react'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, update } = useSession()
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [validating, setValidating] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Get token and email from URL params
    const tokenParam = searchParams.get('token')
    const emailParam = searchParams.get('email')
    const unverified = searchParams.get('unverified')

    if (tokenParam && emailParam) {
      setToken(tokenParam)
      setEmail(emailParam)
      validateToken(tokenParam, emailParam)
    } else if (unverified === 'true') {
      // User was redirected here because email is not verified
      setValidating(false)
      setTokenValid(false)
      // Show resend option
    } else {
      setValidating(false)
      setTokenValid(false)
    }
  }, [searchParams])

  const validateToken = async (tokenValue: string, emailValue: string) => {
    try {
      const response = await fetch(
        `/api/auth/verify-email/verify?token=${tokenValue}&email=${encodeURIComponent(emailValue)}`
      )
      const data = await response.json()

      if (response.ok && data.valid) {
        setTokenValid(true)
        // Auto-verify if token is valid
        await handleVerify(tokenValue, emailValue)
      } else {
        setTokenValid(false)
      }
    } catch (err) {
      setTokenValid(false)
    } finally {
      setValidating(false)
    }
  }

  const handleVerify = async (tokenValue?: string, emailValue?: string) => {
    const verifyToken = tokenValue || token
    const verifyEmail = emailValue || email

    if (!verifyToken || !verifyEmail) {
      toast({
        title: 'Invalid Link',
        description: 'The verification link is missing required parameters.',
        variant: 'destructive',
      })
      return
    }

    setVerifying(true)

    try {
      const response = await fetch('/api/auth/verify-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken, email: verifyEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email')
      }

      setVerified(true)
      
      // Update session to reflect email verification
      if (session) {
        await update()
      }

      toast({
        title: 'Email Verified',
        description: 'Your email has been verified successfully!',
        variant: 'success',
      })

      // Redirect to home or complete profile after 2 seconds
      setTimeout(() => {
        router.push('/auth/complete-profile')
      }, 2000)
    } catch (err: any) {
      toast({
        title: 'Verification Failed',
        description: err.message || 'Failed to verify email. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    try {
      const response = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification email')
      }

      toast({
        title: 'Verification Email Sent',
        description: 'A new verification email has been sent. Please check your inbox.',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Failed to Send Email',
        description: err.message || 'Failed to send verification email. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Validating verification link...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Email Verified!</CardTitle>
            <CardDescription className="text-center">
              Your email has been verified successfully. Redirecting...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
              <p className="text-sm">You can now access all features of your account.</p>
            </div>
            <Link href="/auth/complete-profile">
              <Button className="w-full">Continue to Profile Setup</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!tokenValid || !token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-4">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm" className="mb-2">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Invalid Verification Link</CardTitle>
            <CardDescription className="text-center">
              This verification link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              <p className="text-sm">
                The verification link you used is invalid or has expired. Verification links expire after 24 hours for
                security reasons.
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleResend} className="flex-1">
                <Mail className="h-4 w-4 mr-2" />
                Resend Verification Email
              </Button>
              <Link href="/auth/signin" className="flex-1">
                <Button variant="outline" className="w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4">
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            Click the button below to verify your email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded text-sm">
            <p className="font-medium mb-1">Email to verify:</p>
            <p>{email}</p>
          </div>

          <Button
            onClick={() => handleVerify()}
            disabled={verifying}
            className="w-full"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verify Email
              </>
            )}
          </Button>

          <div className="text-center">
            <Button variant="link" onClick={handleResend} disabled={verifying}>
              Resend Verification Email
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already verified?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
