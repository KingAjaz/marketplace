/**
 * Supabase Auth Utilities
 * 
 * Helper functions for authentication with Supabase Auth
 * Syncs Supabase Auth users with Prisma User model
 */
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { RoleType } from '@prisma/client'

/**
 * Get the current user session from Supabase
 */
export async function getServerSession() {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return session
}

/**
 * Get the current user with profile data from Prisma
 */
export async function getCurrentUser() {
  const session = await getServerSession()
  if (!session?.user) {
    return null
  }

  // Get or create user in Prisma from Supabase Auth
  // First try to find by Supabase user ID (for users created via Supabase Auth)
  let user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        where: { isActive: true },
        select: { role: true },
      },
    },
  })

  // If not found by ID, try to find by email (for users created via NextAuth or other methods)
  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      include: {
        roles: {
          where: { isActive: true },
          select: { role: true },
        },
      },
    })

    // If found by email, update metadata (but keep existing ID - can't change primary key in Prisma)
    if (user) {
      try {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || user.name,
            image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || user.image,
            emailVerified: session.user.email_confirmed_at 
              ? new Date(session.user.email_confirmed_at) 
              : user.emailVerified,
          },
          include: {
            roles: {
              where: { isActive: true },
              select: { role: true },
            },
          },
        })
      } catch (updateError: any) {
        console.error('Failed to update user metadata:', updateError)
        // Continue with existing user data if update fails
      }
    }
  } else {
    // User found by Supabase ID, update metadata
    try {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || user.name,
          image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || user.image,
          emailVerified: session.user.email_confirmed_at 
            ? new Date(session.user.email_confirmed_at) 
            : user.emailVerified,
        },
        include: {
          roles: {
            where: { isActive: true },
            select: { role: true },
          },
        },
      })
    } catch (updateError: any) {
      console.error('Failed to update user metadata:', updateError)
      // Continue with existing user data if update fails
    }
  }

  // If user still doesn't exist, create it
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: session.user.id,
        email: session.user.email!,
        name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || null,
        image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
        emailVerified: session.user.email_confirmed_at ? new Date(session.user.email_confirmed_at) : null,
        // Create default BUYER role
        roles: {
          create: {
            role: 'BUYER',
            isActive: true,
          },
        },
      },
      include: {
        roles: {
          where: { isActive: true },
          select: { role: true },
        },
      },
    })
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    phoneNumber: user.phoneNumber,
    emailVerified: user.emailVerified,
    roles: user.roles.map((r) => r.role) as RoleType[],
  }
}

/**
 * Sync Supabase Auth user with Prisma User model
 * Call this after successful authentication
 */
export async function syncUserWithPrisma(supabaseUserId: string, email: string, metadata?: any) {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          where: { isActive: true },
        },
      },
    })

    if (existingUser) {
      // Update existing user
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: metadata?.full_name || metadata?.name || existingUser.name,
          image: metadata?.avatar_url || metadata?.picture || existingUser.image,
        },
      })
      return existingUser
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        id: supabaseUserId,
        email,
        name: metadata?.full_name || metadata?.name || null,
        image: metadata?.avatar_url || metadata?.picture || null,
        emailVerified: new Date(),
        roles: {
          create: {
            role: 'BUYER',
            isActive: true,
          },
        },
      },
      include: {
        roles: {
          where: { isActive: true },
        },
      },
    })

    return newUser
  } catch (error) {
    console.error('Error syncing user with Prisma:', error)
    throw error
  }
}
