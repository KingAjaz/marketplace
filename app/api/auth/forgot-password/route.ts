/**
 * Forgot Password API
 * 
 * Sends a password reset token to the user's email
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import crypto from 'crypto'
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting for password reset
  const rateLimitResult = await checkRateLimit(request, rateLimiters.auth)
  if (!rateLimitResult.success) {
    return rateLimitResult.response as NextResponse
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    // Don't reveal if user exists or not for security
    // Always return success message
    if (!user || !user.password) {
      // User doesn't exist or is an SSO user (no password)
      // Return success to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token in VerificationToken table
    // Delete any existing reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: {
        identifier: email.toLowerCase(),
      },
    })

    // Create new reset token
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: resetToken,
        expires: resetTokenExpiry,
      },
    })

    // Send password reset email
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`

    const emailResult = await sendEmail({
      to: email,
      subject: 'Reset Your Password - Nigerian Marketplace',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Password Reset Request</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hello${user.name ? ` ${user.name}` : ''},</p>
            <p>We received a request to reset your password for your Nigerian Marketplace account.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 0;"><strong>Click the button below to reset your password:</strong></p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="color: #6b7280; font-size: 12px; word-break: break-all; background: #f3f4f6; padding: 12px; border-radius: 6px;">
              ${resetUrl}
            </p>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px;"><strong>Security Notice:</strong></p>
              <ul style="margin: 10px 0 0 0; padding-left: 20px; font-size: 14px;">
                <li>This link will expire in 1 hour</li>
                <li>If you didn't request a password reset, please ignore this email</li>
                <li>Your password will not change until you click the link above</li>
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
      console.error('Failed to send password reset email:', emailResult.error)
      // Still return success to user to prevent email enumeration
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error: any) {
    console.error('Forgot password error:', error)
    // Return success even on error to prevent email enumeration
    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  }
}
