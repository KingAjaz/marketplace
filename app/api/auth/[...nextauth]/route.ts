import { NextResponse } from 'next/server'

// Temporarily disabled during migration to Supabase Auth
// NextAuth is being replaced with Supabase Auth
// This route is kept for backward compatibility but will return an error

export async function GET() {
  return NextResponse.json(
    { 
      error: 'NextAuth is being migrated to Supabase Auth',
      message: 'Please use Supabase Auth endpoints for authentication.',
      documentation: 'See SUPABASE_AUTH_MIGRATION.md for migration details'
    },
    { status: 501 }
  )
}

export async function POST() {
  return NextResponse.json(
    { 
      error: 'NextAuth is being migrated to Supabase Auth',
      message: 'Please use Supabase Auth endpoints for authentication.',
      documentation: 'See SUPABASE_AUTH_MIGRATION.md for migration details'
    },
    { status: 501 }
  )
}
