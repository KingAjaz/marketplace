/**
 * Seller Application API
 * 
 * Submits a seller application for admin approval.
 * Creates a SELLER role with PENDING status.
 * 
 * Security:
 * - Requires authentication
 * - Requires phone number (profile completion)
 * - Prevents duplicate applications
 * - Only one seller role per user
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has phone number (profile completed)
    if (!session.user.phoneNumber) {
      return NextResponse.json(
        { error: 'Please complete your profile (add phone number) before applying to become a seller' },
        { status: 400 }
      )
    }

    // Get application data from request
    const {
      shopName,
      businessDescription,
      businessAddress,
      city,
      state,
      businessType,
      businessRegistrationNumber,
    } = await request.json()

    // Validate required fields
    if (!shopName || !shopName.trim()) {
      return NextResponse.json(
        { error: 'Shop/Business name is required' },
        { status: 400 }
      )
    }
    if (!businessDescription || !businessDescription.trim()) {
      return NextResponse.json(
        { error: 'Business description is required' },
        { status: 400 }
      )
    }
    if (!businessAddress || !businessAddress.trim()) {
      return NextResponse.json(
        { error: 'Business address is required' },
        { status: 400 }
      )
    }
    if (!city || !city.trim()) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      )
    }
    if (!state || !state.trim()) {
      return NextResponse.json(
        { error: 'State is required' },
        { status: 400 }
      )
    }
    if (!businessType || !businessType.trim()) {
      return NextResponse.json(
        { error: 'Business type is required' },
        { status: 400 }
      )
    }

    // Check if user already has a seller role
    const existingSellerRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
      },
    })

    if (existingSellerRole) {
      if (existingSellerRole.sellerStatus === 'APPROVED') {
        return NextResponse.json(
          { error: 'You are already an approved seller' },
          { status: 400 }
        )
      }
      if (existingSellerRole.sellerStatus === 'PENDING') {
        return NextResponse.json(
          { error: 'You already have a pending seller application' },
          { status: 400 }
        )
      }
      if (existingSellerRole.sellerStatus === 'REJECTED') {
        // Allow re-application if previously rejected
        // Update shop information if shop exists
        const existingShop = await prisma.shop.findUnique({
          where: { userId: session.user.id },
        })

        // Prepare description with additional application metadata
        let fullDescription = businessDescription.trim()
        if (businessType || businessRegistrationNumber) {
          fullDescription += '\n\n--- Application Details ---\n'
          if (businessType) {
            fullDescription += `Business Type: ${businessType}\n`
          }
          if (businessRegistrationNumber) {
            fullDescription += `Registration Number: ${businessRegistrationNumber}\n`
          }
        }

        if (existingShop) {
          await prisma.shop.update({
            where: { id: existingShop.id },
            data: {
              name: shopName.trim(),
              description: fullDescription,
              address: businessAddress.trim(),
              city: city.trim(),
              state: state.trim(),
            },
          })
        } else {
          // Create shop with application data (inactive until approved)
          await prisma.shop.create({
            data: {
              userId: session.user.id,
              name: shopName.trim(),
              description: fullDescription,
              address: businessAddress.trim(),
              city: city.trim(),
              state: state.trim(),
              isActive: false, // Inactive until seller is approved
            },
          })
        }

        await prisma.userRole.update({
          where: { id: existingSellerRole.id },
          data: {
            sellerStatus: 'PENDING',
            kycSubmitted: true,
            kycApproved: false,
            kycRejectedAt: null,
            rejectionReason: null,
            updatedAt: new Date(),
          },
        })

        return NextResponse.json({
          message: 'Seller application resubmitted successfully',
          status: 'PENDING',
        })
      }
    }

    // Create new seller role with PENDING status
    const sellerRole = await prisma.userRole.create({
      data: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: false, // Inactive until approved
        sellerStatus: 'PENDING',
        kycSubmitted: true,
        kycApproved: false,
      },
    })

    // Prepare description with additional application metadata
    let fullDescription = businessDescription.trim()
    if (businessType || businessRegistrationNumber) {
      fullDescription += '\n\n--- Application Details ---\n'
      if (businessType) {
        fullDescription += `Business Type: ${businessType}\n`
      }
      if (businessRegistrationNumber) {
        fullDescription += `Registration Number: ${businessRegistrationNumber}\n`
      }
    }

    // Create shop with application data (inactive until approved)
    // This allows admin to review the shop information before approval
    await prisma.shop.create({
      data: {
        userId: session.user.id,
        name: shopName.trim(),
        description: fullDescription,
        address: businessAddress.trim(),
        city: city.trim(),
        state: state.trim(),
        isActive: false, // Shop will be activated when seller is approved
      },
    })

    console.log('[Seller Application] Submitted:', {
      userId: session.user.id,
      shopName: shopName.trim(),
      businessType,
      businessRegistrationNumber: businessRegistrationNumber || 'Not provided',
    })

    return NextResponse.json({
      message: 'Seller application submitted successfully. Awaiting admin approval.',
      status: 'PENDING',
    })
  } catch (error: any) {
    console.error('Seller application error:', error)
    
    let errorMessage = 'Failed to submit seller application'
    if (error.code === 'P2002') {
      errorMessage = 'You already have a seller application'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
