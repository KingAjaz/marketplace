/**
 * Verify OTP and update user phone number using Supabase
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber } from '@/lib/utils'
import { verifyPhoneOTP } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phoneNumber, otp } = await request.json()

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      )
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    // Verify OTP with Supabase
    const verifyResult = await verifyPhoneOTP(normalizedPhone, otp)

    if (!verifyResult.success) {
      return NextResponse.json(
        { error: verifyResult.error || 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Update user phone number and verification status
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phoneNumber: normalizedPhone,
        phoneVerified: true,
        phoneVerifiedAt: new Date(),
      },
    })

    return NextResponse.json({
      message: 'Phone number verified successfully',
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
