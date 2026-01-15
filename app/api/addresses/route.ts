/**
 * Addresses API
 * Get all addresses for the authenticated user
 * Create a new address
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' }, // Default address first
        { createdAt: 'desc' }, // Then by creation date
      ],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    console.error('Get addresses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      label,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault,
      phone,
      notes,
      addressText,
      latitude,
      longitude,
    } = await request.json()

    // Validate required fields (check for empty strings too)
    if (!street || !street.trim() || !city || !city.trim() || !state || !state.trim()) {
      return NextResponse.json(
        { error: 'Street, city, and state are required' },
        { status: 400 }
      )
    }

    // Check if Address model exists in Prisma client
    // This happens if Prisma client wasn't regenerated after schema changes
    if (!prisma.address || typeof (prisma.address as any).create !== 'function') {
      console.error('Prisma Address model not found. Please run: npx prisma generate')
      return NextResponse.json(
        { 
          error: 'Database model not initialized. Please stop the dev server, run "npx prisma generate", and restart the server.',
          details: 'The Address model was added to the schema but the Prisma client needs to be regenerated.'
        },
        { status: 500 }
      )
    }

    // If setting as default, unset other default addresses
    if (isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    const address = await prisma.address.create({
      data: {
        userId: session.user.id,
        label: label?.trim() || null,
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode?.trim() || null,
        country: country?.trim() || 'Nigeria',
        addressText: addressText?.trim() || null,
        latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
        longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
        isDefault: isDefault === true,
        phone: phone?.trim() || null,
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error: any) {
    console.error('Create address error:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create address'
    if (error.message) {
      errorMessage = error.message
    } else if (error.code === 'P2002') {
      errorMessage = 'This address already exists'
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid user reference'
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
