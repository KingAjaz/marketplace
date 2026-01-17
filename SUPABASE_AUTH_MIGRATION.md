# Supabase Auth Migration Guide

This document outlines the migration from NextAuth to Supabase Auth.

## Current Status

✅ **Completed:**
- Installed `@supabase/ssr` package
- Created Supabase client helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`)
- Created Supabase middleware helper (`lib/supabase/middleware.ts`)
- Created auth utilities (`lib/auth-supabase.ts`)
- Created OAuth callback handler (`app/auth/callback/route.ts`)
- Updated signin page to use Supabase Auth
- Created user sync API routes

## Setup Required

### 1. Supabase Project Setup

1. Create a project at [Supabase](https://supabase.com/)
2. Get your project URL and anon key from **Settings → API**
3. Add to `.env` and Vercel:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 2. Configure Google OAuth in Supabase

1. In Supabase Dashboard → **Authentication → Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - Client ID: `GOOGLE_CLIENT_ID`
   - Client Secret: `GOOGLE_CLIENT_SECRET`
4. **Important:** In Google Cloud Console, change redirect URI to:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```
   (This is Supabase's callback URL, not your app's URL)

### 3. Configure Supabase URLs

In Supabase Dashboard → **Authentication → URL Configuration**:
- Add Site URL: `https://marketplace-azure-delta.vercel.app`
- Add Redirect URLs: 
  - `https://marketplace-azure-delta.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for dev)

## Migration Steps

### Step 1: Update Environment Variables

Remove from `.env` and Vercel:
- ❌ `NEXTAUTH_SECRET`
- ❌ `NEXTAUTH_URL`

Keep for Supabase:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `GOOGLE_CLIENT_ID` (but configure it in Supabase, not NextAuth)
- ✅ `GOOGLE_CLIENT_SECRET` (but configure it in Supabase, not NextAuth)

### Step 2: Update Middleware

The middleware needs to be updated to use Supabase Auth instead of NextAuth. This is in progress.

### Step 3: Migrate API Routes

Replace `getServerSession(authOptions)` with `getCurrentUser()` from `@/lib/auth-supabase`.

Files to update (15+ files):
- All `/app/api/admin/**/route.ts` files
- All `/app/api/seller/**/route.ts` files
- All `/app/api/rider/**/route.ts` files
- Other protected API routes

### Step 4: Migrate Client Components

Replace `useSession()` from `next-auth/react` with Supabase Auth client.

Components to update:
- `components/navbar.tsx`
- `app/checkout/page.tsx`
- `app/seller/dashboard/page.tsx`
- Other components using `useSession`

### Step 5: Update Providers

Replace `SessionProvider` from NextAuth with a Supabase Auth provider (if needed).

### Step 6: Remove NextAuth Files

After migration is complete:
- Remove `lib/auth.ts` (NextAuth config)
- Remove `app/api/auth/[...nextauth]/route.ts`
- Remove `@auth/prisma-adapter` dependency (optional)

## Important Notes

1. **Google OAuth Redirect URI**: Must point to Supabase's callback URL, not your app's callback
2. **User Sync**: Users are automatically synced between Supabase Auth and Prisma on authentication
3. **Password Authentication**: Email/password auth works through Supabase Auth
4. **Phone OTP**: Already using Supabase, so no changes needed

## Testing Checklist

- [ ] Email/password sign in
- [ ] Google OAuth sign in
- [ ] Phone OTP verification
- [ ] User profile sync with Prisma
- [ ] Protected routes (admin, seller, rider)
- [ ] Middleware route protection
- [ ] Session persistence
