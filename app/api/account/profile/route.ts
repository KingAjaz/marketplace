/**
 * User Profile API
 * 
 * GET: Get current user profile
 * PUT: Update user profile (name, phone, image)
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizePhoneNumber, validateNigerianPhone } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        image: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, phoneNumber, image } = await request.json()

    // Build update data object
    const updateData: any = {}

    if (name !== undefined) {
      updateData.name = name?.trim() || null
    }

    if (phoneNumber !== undefined && phoneNumber !== null) {
      const normalizedPhone = normalizePhoneNumber(phoneNumber)
      if (!validateNigerianPhone(normalizedPhone)) {
        return NextResponse.json(
          { error: 'Invalid phone number format. Please use a valid Nigerian phone number.' },
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

      updateData.phoneNumber = normalizedPhone
      updateData.phoneVerified = true
      updateData.phoneVerifiedAt = new Date()
    }

    if (image !== undefined) {
      updateData.image = image?.trim() || null
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        emailVerified: true,
        phoneVerified: true,
        image: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Update profile error:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This phone number is already in use' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
