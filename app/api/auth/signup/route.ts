/**
 * User Signup API
 * Creates a new user account with email/password
 * Sends email verification email
 * Phone verification is handled separately after signup
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Rate limiting for signup
  const rateLimitResult = await checkRateLimit(request, rateLimiters.auth)
  if (!rateLimitResult.success) {
    return rateLimitResult.response as NextResponse
  }

  try {
    const { name, email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user (email not verified initially)
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        emailVerified: null, // Email not verified yet
        // Create default BUYER role
        roles: {
          create: {
            role: 'BUYER',
            isActive: true,
          },
        },
      },
    })

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Store token in VerificationToken table
    await prisma.verificationToken.create({
      data: {
        identifier: email.toLowerCase(),
        token: verificationToken,
        expires: verificationTokenExpiry,
      },
    })

    // Send verification email
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`

    try {
      const emailResult = await sendEmail({
        to: email,
        subject: 'Verify Your Email - Nigerian Marketplace',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Welcome to Nigerian Marketplace!</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
              <p>Hello${name ? ` ${name}` : ''},</p>
              <p>Thank you for signing up! Please verify your email address to complete your account setup and unlock all features.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="margin: 0;"><strong>Click the button below to verify your email:</strong></p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email</a>
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
                  <li>If you didn't create an account, please ignore this email</li>
                  <li>Verifying your email helps secure your account</li>
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
        // Continue with signup even if email fails - user can request resend later
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
      // Continue with signup even if email fails
    }

    return NextResponse.json(
      { 
        message: 'Account created successfully. Please check your email to verify your account.',
        userId: user.id,
        emailSent: true,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Signup error:', error)
    
    let errorMessage = 'Failed to create account'
    let statusCode = 500
    
    if (error.code === 'P2002') {
      // Unique constraint violation
      if (error.meta?.target?.includes('email')) {
        errorMessage = 'An account with this email already exists'
        statusCode = 409
      } else {
        errorMessage = 'A duplicate record was detected. Please try again.'
        statusCode = 409
      }
    } else if (error.message?.includes('password')) {
      errorMessage = 'Password validation failed. Please ensure your password meets the requirements.'
      statusCode = 400
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    )
  }
}
