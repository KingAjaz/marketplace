/**
 * Complete Profile API
 * 
 * Updates user's phone number without OTP verification.
 * Phone number is mandatory and used only for delivery contact.
 * 
 * Security:
 * - Validates user is authenticated
 * - Validates phone number format
 * - Prevents phone number duplication
 * - Ensures user can only update their own profile
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber, validateNigerianPhone } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.error('[Complete Profile] No session or user ID')
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in again.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { phoneNumber } = body

    console.log('[Complete Profile] Request:', { userId: session.user.id, phoneNumber })

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Normalize first, then validate
    const normalizedPhone = normalizePhoneNumber(phoneNumber)

    // Validate the normalized phone number format
    if (!validateNigerianPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use a valid Nigerian phone number (e.g., 08012345678 or +2348012345678).' },
        { status: 400 }
      )
    }

    // Check if phone number is already taken by another user
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    })

    if (existingUser && existingUser.id !== session.user.id) {
      return NextResponse.json(
        { error: 'This phone number is already registered to another account' },
        { status: 400 }
      )
    }

    // Verify user exists before updating
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      console.error('[Complete Profile] User not found:', session.user.id)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update user's phone number
    // Note: We keep phoneVerified for backward compatibility but set it to true
    // since we're not using OTP verification anymore
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phoneNumber: normalizedPhone,
        phoneVerified: true, // Set to true since no OTP is required
        phoneVerifiedAt: new Date(),
      },
    })

    console.log('[Complete Profile] Success:', { userId: session.user.id, phoneNumber: normalizedPhone })

    return NextResponse.json({
      message: 'Profile updated successfully',
      phoneNumber: normalizedPhone,
    })
  } catch (error: any) {
    console.error('Complete profile error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to update profile'
    
    if (error.code === 'P2002') {
      errorMessage = 'This phone number is already in use'
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    )
  }
}
