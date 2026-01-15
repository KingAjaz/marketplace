/**
 * Verify Email Change API
 * 
 * Verifies email change token and updates user email
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { token, email, oldEmail } = await request.json()

    if (!token || !email || !oldEmail) {
      return NextResponse.json(
        { error: 'Token, email, and old email are required' },
        { status: 400 }
      )
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Check if token matches new email
    if (verificationToken.identifier !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { error: 'Verification token has expired. Please request a new email change.' },
        { status: 400 }
      )
    }

    // Find user by old email
    const user = await prisma.user.findUnique({
      where: { email: oldEmail.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if new email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered to another account' },
        { status: 400 }
      )
    }

    // Update user email and mark as unverified (needs re-verification)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: email.toLowerCase(),
        emailVerified: null, // Reset verification status - user needs to verify new email
      },
    })

    // Delete used token
    await prisma.verificationToken.delete({
      where: { token },
    })

    // Send confirmation email to old email
    const { sendEmail } = await import('@/lib/email')
    await sendEmail({
      to: oldEmail,
      subject: 'Email Address Changed - Nigerian Marketplace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Email Address Changed</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello${user.name ? ` ${user.name}` : ''},</p>
            <p>Your email address has been successfully changed.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Old Email:</strong> ${oldEmail}</p>
              <p><strong>New Email:</strong> ${email}</p>
              <p><strong>Changed At:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0; font-size: 14px;"><strong>Security Notice:</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">If you did not request this change, please contact our support team immediately.</p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
              From now on, please use your new email address to sign in.
            </p>
          </div>
        </body>
        </html>
      `,
    })

    return NextResponse.json({
      message: 'Email address changed successfully. Please verify your new email address.',
    })
  } catch (error: any) {
    console.error('Verify email change error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to verify email change' },
      { status: 500 }
    )
  }
}

/**
 * GET: Verify token validity
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      )
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { valid: false, error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    if (verificationToken.identifier !== email.toLowerCase()) {
      return NextResponse.json(
        { valid: false, error: 'Invalid verification token' },
        { status: 400 }
      )
    }

    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token },
      })
      return NextResponse.json(
        { valid: false, error: 'Verification token has expired' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: true,
      message: 'Verification token is valid',
    })
  } catch (error: any) {
    console.error('Verify token error:', error)
    return NextResponse.json(
      { valid: false, error: error.message || 'Failed to verify token' },
      { status: 500 }
    )
  }
}
