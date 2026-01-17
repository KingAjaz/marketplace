/**
 * NextAuth Configuration
 * Supports Email/Password and OAuth (Google) authentication
 * Phone verification is handled separately after signup
 */
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { RoleType } from '@prisma/client'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required')
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.password) {
          throw new Error('Invalid email or password')
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) {
          throw new Error('Invalid email or password')
        }

      // Fetch email verification status
      const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      })

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: userData?.emailVerified || null,
      }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  events: {
    async signIn({ user, isNewUser, account }) {
      // For OAuth users (Google), mark email as verified since OAuth providers verify emails
      if (account?.provider === 'google' && user.email) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailVerified: new Date(),
            },
          })
        } catch (error) {
          console.error('Error updating email verification for OAuth user:', error)
        }
      }

      // Ensure new OAuth users get a BUYER role
      if (isNewUser && user.id) {
        try {
          // Check if user already has a role
          const existingRole = await prisma.userRole.findFirst({
            where: { userId: user.id },
          })

          // If no role exists, create BUYER role
          if (!existingRole) {
            await prisma.userRole.create({
              data: {
                userId: user.id,
                role: 'BUYER',
                isActive: true,
              },
            })
          }
        } catch (error) {
          console.error('Error creating user role:', error)
        }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // Fetch user roles
        try {
          let userRoles = await prisma.userRole.findMany({
            where: { userId: user.id, isActive: true },
            select: { role: true },
          })
          
          // If no roles exist (new OAuth user), create BUYER role
          if (userRoles.length === 0) {
            await prisma.userRole.create({
              data: {
                userId: user.id,
                role: 'BUYER',
                isActive: true,
              },
            })
            // Fetch again after creation
            userRoles = await prisma.userRole.findMany({
              where: { userId: user.id, isActive: true },
              select: { role: true },
            })
          }
          
          token.roles = userRoles.map((r) => r.role)
        } catch (error) {
          console.error('Error fetching/creating user roles:', error)
          token.roles = []
        }

        try {
          const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { phoneNumber: true, emailVerified: true },
          })
          token.phoneNumber = userData?.phoneNumber || null
          token.emailVerified = userData?.emailVerified || null
        } catch (error) {
          console.error('Error fetching user data:', error)
          token.phoneNumber = null
          token.emailVerified = null
        }
      } else if (trigger === 'update' && token.id) {
        // Refresh user data on session update
        try {
          const userRoles = await prisma.userRole.findMany({
            where: { userId: token.id as string, isActive: true },
            select: { role: true },
          })
          token.roles = userRoles.map((r) => r.role)

          const userData = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { phoneNumber: true, emailVerified: true },
          })
          token.phoneNumber = userData?.phoneNumber || null
          token.emailVerified = userData?.emailVerified || null
          
          console.log('[Auth] Session updated - Roles:', token.roles, 'Phone:', token.phoneNumber, 'EmailVerified:', token.emailVerified)
        } catch (error) {
          console.error('Error refreshing user data:', error)
        }
      }
      
      // Only refresh if roles/phone/emailVerified are missing (not on every request)
      if (!user && !trigger && token.id) {
        // Only refresh if data is missing to avoid unnecessary queries
        if (!token.roles || !token.phoneNumber || token.emailVerified === undefined) {
          try {
            const [userRoles, userData] = await Promise.all([
              prisma.userRole.findMany({
                where: { userId: token.id as string, isActive: true },
                select: { role: true },
              }),
              prisma.user.findUnique({
                where: { id: token.id as string },
                select: { phoneNumber: true, emailVerified: true },
              }),
            ])
            token.roles = userRoles.map((r) => r.role)
            token.phoneNumber = userData?.phoneNumber || null
            token.emailVerified = userData?.emailVerified || null
          } catch (error) {
            console.error('Error refreshing user data on request:', error)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.roles = (token.roles || []) as RoleType[]
        session.user.phoneNumber = token.phoneNumber as string | null
        session.user.emailVerified = token.emailVerified as Date | null
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
}
