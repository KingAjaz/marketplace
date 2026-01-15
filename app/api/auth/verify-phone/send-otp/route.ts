/**
 * Send OTP for phone verification using Supabase
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber } from '@/lib/utils'
import { sendPhoneOTP } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    // Check if phone is already taken
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'Phone number already in use' },
        { status: 400 }
      )
    }

    // Send OTP via Supabase
    const otpResult = await sendPhoneOTP(normalizedPhone)

    if (!otpResult.success) {
      console.error('Failed to send OTP:', otpResult.error)
      return NextResponse.json(
        { error: otpResult.error || 'Failed to send OTP' },
        { status: 500 }
      )
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Supabase OTP] Sent to: ${normalizedPhone}`)
      console.log(`[Supabase OTP] Result:`, otpResult)
    }

    return NextResponse.json({
      message: 'OTP sent successfully to your phone',
      success: true,
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
