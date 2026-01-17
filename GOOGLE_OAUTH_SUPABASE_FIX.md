# Fix: Google OAuth Redirect URI Mismatch with Supabase

## Problem
You're getting `Error 400: redirect_uri_mismatch` when trying to sign in with Google OAuth.

## Root Cause
When using **Supabase Auth**, Google Cloud Console needs to have **Supabase's callback URL**, not your app's callback URL.

## Solution

### Step 1: Find Your Supabase Project URL

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy your **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)

### Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services → Credentials**
3. Click on your **OAuth 2.0 Client ID**
4. Under **Authorized redirect URIs**, you should see your old redirect URIs like:
   - `https://marketplace-azure-delta.vercel.app/api/auth/callback/google` ❌ (Remove this)
   - `http://localhost:3000/api/auth/callback/google` ❌ (Remove this)

5. **Replace them with Supabase's callback URL:**
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   
   **Example:**
   ```
   https://abcdefghijklmnop.supabase.co/auth/v1/callback
   ```

6. **Also add for local development (if needed):**
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
   (Note: The same URL works for both dev and production since Supabase handles it)

7. Click **Save**

### Step 3: Configure OAuth in Supabase Dashboard

1. In Supabase Dashboard → **Authentication → Providers**
2. Find **Google** provider and enable it
3. Add your Google OAuth credentials:
   - **Client ID (for OAuth)**: `GOOGLE_CLIENT_ID` from your `.env`
   - **Client Secret (for OAuth)**: `GOOGLE_CLIENT_SECRET` from your `.env`
4. Click **Save**

### Step 4: Configure Site URLs in Supabase

1. In Supabase Dashboard → **Authentication → URL Configuration**
2. Set **Site URL** to your production URL:
   ```
   https://marketplace-azure-delta.vercel.app
   ```
3. Add **Redirect URLs** (these are where Supabase redirects AFTER OAuth):
   - `https://marketplace-azure-delta.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

### Step 5: Verify Environment Variables

Make sure these are set in Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Important Notes

- **Google Cloud Console redirect URI**: Must be `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
- **Supabase redirect URL**: This is where users land AFTER OAuth (your app's `/auth/callback`)
- The flow is: User → Google → Supabase (`/auth/v1/callback`) → Your App (`/auth/callback`)

### How OAuth Flow Works with Supabase

1. User clicks "Sign in with Google" on your app
2. User is redirected to Google for authentication
3. Google redirects to: `https://YOUR_PROJECT.supabase.co/auth/v1/callback` (Supabase)
4. Supabase processes the OAuth callback and creates/updates the user session
5. Supabase redirects to: `https://your-app.vercel.app/auth/callback?code=...` (Your app)
6. Your app's `/auth/callback` route exchanges the code for a session and syncs with Prisma
7. User is redirected to their destination

### Testing

After making these changes:
1. Wait 1-2 minutes for Google Cloud Console changes to propagate
2. Try signing in with Google again
3. The redirect should work correctly
