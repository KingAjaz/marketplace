/**
 * Set Default Address API
 * Set a specific address as the default address
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
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

    // Unset all other default addresses
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

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        isDefault: true,
      },
    })

    return NextResponse.json({ address: updatedAddress })
  } catch (error) {
    console.error('Set default address error:', error)
    return NextResponse.json(
      { error: 'Failed to set default address' },
      { status: 500 }
    )
  }
}
