import { NextRequest, NextResponse } from 'next/server'

/**
 * NextAuth Route Handler - DISABLED
 * 
 * This route is disabled as we're migrating to Supabase Auth.
 * 
 * ⚠️ Some API routes still use getServerSession from NextAuth.
 * They will need to be migrated to use getCurrentUser from @/lib/auth-supabase.
 * 
 * Once all routes are migrated, this file can be deleted.
 */

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'NextAuth is disabled. This app now uses Supabase Auth.',
      message: 'Please use Supabase Auth endpoints for authentication.',
      documentation: 'See MIGRATION_STATUS.md for migration details',
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      error: 'NextAuth is disabled. This app now uses Supabase Auth.',
      message: 'Please use Supabase Auth endpoints for authentication.',
      documentation: 'See MIGRATION_STATUS.md for migration details',
    },
    { status: 410 } // 410 Gone - resource no longer available
  )
}
