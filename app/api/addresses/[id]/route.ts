/**
 * Single Address API
 * Get, update, or delete a specific address
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    if (address.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Get address error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch address' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
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

    // Verify address exists and belongs to user
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    })

    if (!existingAddress) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    if (existingAddress.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // If setting as default, unset other default addresses
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId: session.user.id,
          isDefault: true,
          id: { not: id },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const address = await prisma.address.update({
      where: { id },
      data: {
        label: label !== undefined ? label : existingAddress.label,
        street: street || existingAddress.street,
        city: city || existingAddress.city,
        state: state || existingAddress.state,
        postalCode: postalCode !== undefined ? postalCode : existingAddress.postalCode,
        country: country || existingAddress.country,
        addressText: addressText !== undefined ? addressText : existingAddress.addressText,
        latitude:
          latitude !== undefined && latitude !== null
            ? parseFloat(latitude)
            : existingAddress.latitude,
        longitude:
          longitude !== undefined && longitude !== null
            ? parseFloat(longitude)
            : existingAddress.longitude,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault,
        phone: phone !== undefined ? phone : existingAddress.phone,
        notes: notes !== undefined ? notes : existingAddress.notes,
      },
    })

    return NextResponse.json({ address })
  } catch (error) {
    console.error('Update address error:', error)
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const address = await prisma.address.findUnique({
      where: { id },
    })

    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }

    if (address.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.address.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Address deleted successfully' })
  } catch (error) {
    console.error('Delete address error:', error)
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    )
  }
}
