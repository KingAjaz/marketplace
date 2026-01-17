import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Temporarily restored during migration to Supabase Auth
// This route is needed for middleware and API routes that still use NextAuth
// NOTE: NEXTAUTH_SECRET must be set in Vercel environment variables for this to work
// Once migration is complete, this route and NEXTAUTH_SECRET will be removed

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
