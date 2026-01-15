# Troubleshooting Admin Access

## Problem: Can't Access Admin Dashboard After Adding Role

If you've added an ADMIN role in Prisma Studio but still can't access the admin dashboard, follow these steps:

## Solution Steps

### Step 1: Verify the Role in Database

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Go to the `UserRole` table

3. Find your user's ADMIN role and verify:
   - ✅ `role` = `ADMIN` (exactly, case-sensitive)
   - ✅ `isActive` = `true` (not false)
   - ✅ `userId` matches your user ID

### Step 2: Refresh Your Session

The JWT token caches your roles. You need to refresh it:

#### Option A: Use the Refresh Page (Easiest)

1. Go to: `http://localhost:3000/admin/refresh`
2. Click "Refresh Session"
3. Check if ADMIN role appears
4. Click "Go to Admin Dashboard"

#### Option B: Sign Out and Sign Back In

1. **Sign out completely**:
   - Click "Sign Out" in the navbar
   - Or go to: `http://localhost:3000/api/auth/signout`

2. **Clear browser cache** (optional but recommended):
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Clear cookies for localhost

3. **Sign back in**:
   - Go to: `http://localhost:3000/auth/signin`
   - Sign in with your credentials

4. **Try accessing admin dashboard**:
   - Go to: `http://localhost:3000/admin/dashboard`

### Step 3: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any errors
4. Check Network tab for failed requests

### Step 4: Verify in Code

Check what roles your session has:

1. Add this to any page temporarily:
   ```typescript
   const { data: session } = useSession()
   console.log('My roles:', session?.user?.roles)
   ```

2. Check the browser console to see what roles are loaded

## Common Issues

### Issue 1: Role Not Showing Up

**Cause**: Session not refreshed

**Fix**: 
- Use `/admin/refresh` page
- Or sign out and sign back in

### Issue 2: "Unauthorized" Error

**Cause**: Role not properly set or session not refreshed

**Fix**:
1. Verify role in Prisma Studio (see Step 1)
2. Refresh session (see Step 2)
3. Check middleware is not blocking

### Issue 3: Role Shows But Still Can't Access

**Cause**: Middleware blocking or role check failing

**Fix**:
1. Check browser console for errors
2. Verify `isActive` is `true` in database
3. Make sure role is exactly `ADMIN` (not `admin` or `Admin`)

### Issue 4: Multiple Roles Not Working

**Cause**: User might have multiple roles, but ADMIN not active

**Fix**:
- Make sure the ADMIN role has `isActive: true`
- Other roles can be active too, but ADMIN must be active

## Quick Verification Checklist

- [ ] Role exists in `UserRole` table
- [ ] `role` field = `ADMIN` (exact case)
- [ ] `isActive` = `true`
- [ ] `userId` matches your user ID
- [ ] Signed out and signed back in
- [ ] Session refreshed (check `/admin/refresh`)
- [ ] No errors in browser console
- [ ] No errors in server logs

## Still Not Working?

1. **Check server logs** for errors:
   ```bash
   # In your terminal where you run npm run dev
   # Look for any Prisma or auth errors
   ```

2. **Verify database connection**:
   ```bash
   npx prisma studio
   # Make sure you can see and edit data
   ```

3. **Test with a fresh user**:
   - Create a new account
   - Add ADMIN role immediately
   - Sign out and sign in
   - Should work immediately

4. **Check middleware.ts**:
   - Make sure admin routes are properly protected
   - Verify role check logic

## Need More Help?

If none of these work, check:
- Database connection is working
- Prisma client is up to date (`npx prisma generate`)
- No syntax errors in `lib/auth.ts`
- Environment variables are set correctly
