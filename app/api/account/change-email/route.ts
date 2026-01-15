/**
 * Change Email API
 * 
 * Allows authenticated users to change their email address
 * Requires email verification after change
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { newEmail, password } = await request.json()

    if (!newEmail || !password) {
      return NextResponse.json(
        { error: 'New email and password are required' },
        { status: 400 }
      )
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, password: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has a password (required for email change)
    if (!user.password) {
      return NextResponse.json(
        { error: 'Password required to change email. Please set a password first.' },
        { status: 400 }
      )
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Password is incorrect' },
        { status: 400 }
      )
    }

    // Check if new email is different from current
    if (newEmail.toLowerCase() === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'New email must be different from current email' },
        { status: 400 }
      )
    }

    // Check if new email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered to another account' },
        { status: 400 }
      )
    }

    // Generate email change verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store token in VerificationToken table
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: newEmail.toLowerCase(),
      },
    })

    await prisma.verificationToken.create({
      data: {
        identifier: newEmail.toLowerCase(),
        token: verificationToken,
        expires: verificationTokenExpiry,
      },
    })

    // Store old email in a separate verification token entry for lookup
    // We'll use a special identifier pattern: "email-change:{oldEmail}:{newEmail}"
    // But VerificationToken.identifier is just email. Let's use the new email as identifier
    // and store old email separately or include in verification URL

    // Send verification email to new email address
    // Include old email in URL params so we can look up the user
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email-change?token=${verificationToken}&email=${encodeURIComponent(newEmail)}&oldEmail=${encodeURIComponent(user.email)}`

    const emailResult = await sendEmail({
      to: newEmail,
      subject: 'Verify Your New Email - Nigerian Marketplace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Verify Your New Email</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello${user.name ? ` ${user.name}` : ''},</p>
            <p>You requested to change your email address from <strong>${user.email}</strong> to <strong>${newEmail}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0;"><strong>Click the button below to verify your new email address:</strong></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify New Email</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">
              ${verificationUrl}
            </p>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                <li>This link will expire in 24 hours</li>
                <li>If you didn't request this change, please ignore this email</li>
                <li>Your email will not change until you verify it</li>
                <li>You can still sign in with your old email until the change is verified</li>
              </ul>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
              If you have any questions, please contact our support team.
            </p>
          </div>
        </body>
        </html>
      `,
    })

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error)
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      )
    }

    // Note: Email is not updated yet - it will be updated after verification
    // Store pending email change in a separate field or handle via token verification

    return NextResponse.json({
      message: 'Verification email sent to new email address. Please check your inbox to complete the email change.',
    })
  } catch (error: any) {
    console.error('Change email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to change email' },
      { status: 500 }
    )
  }
}
