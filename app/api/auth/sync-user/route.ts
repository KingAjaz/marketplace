/**
 * Sync Supabase Auth User with Prisma
 * 
 * Called after successful authentication to ensure user exists in Prisma
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncUserWithPrisma } from '@/lib/auth-supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Sync user with Prisma
    await syncUserWithPrisma(
      user.id,
      user.email!,
      user.user_metadata
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Sync user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync user' },
      { status: 500 }
    )
  }
}
