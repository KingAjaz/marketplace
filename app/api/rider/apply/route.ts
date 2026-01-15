/**
 * Rider Application API
 * 
 * POST: Apply to become a rider
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Phone number is required
    if (!session.user.phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required. Please complete your profile first.' },
        { status: 400 }
      )
    }

    const { vehicleType, vehicleNumber, licenseNumber, address, city, state } =
      await request.json()

    if (!vehicleType || !vehicleNumber || !licenseNumber || !address || !city || !state) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already has a rider role
    const existingRider = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'RIDER',
      },
    })

    if (existingRider) {
      if (existingRider.isActive) {
        return NextResponse.json(
          { error: 'You are already an active rider' },
          { status: 400 }
        )
      } else {
        // Update existing application
        await prisma.userRole.update({
          where: { id: existingRider.id },
          data: {
            riderStatus: 'PENDING',
            isActive: false,
          },
        })
      }
    } else {
      // Create new rider role
      await prisma.userRole.create({
        data: {
          userId: session.user.id,
          role: 'RIDER',
          riderStatus: 'PENDING',
          isActive: false,
        },
      })
    }

    // Store rider application details (you might want to create a RiderProfile model)
    // For now, we'll just return success

    return NextResponse.json({
      message: 'Rider application submitted successfully. Awaiting admin approval.',
    })
  } catch (error: any) {
    console.error('Rider application error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit rider application' },
      { status: 500 }
    )
  }
}
