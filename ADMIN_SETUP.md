# Admin Dashboard Access Guide

## Quick Access

Once you have an admin account, access the dashboard at:
**`http://localhost:3000/admin/dashboard`**

## Creating Your First Admin User

### Method 1: Using the Script (Easiest)

1. **Sign up** a regular account first:
   - Go to `http://localhost:3000/auth/signup`
   - Create an account with your email
   - Complete your profile (add phone number)

2. **Run the admin creation script**:
   ```bash
   npx tsx scripts/create-admin.ts your-email@example.com
   ```

3. **Sign out and sign back in** to refresh your session

4. **Access admin dashboard** at `/admin/dashboard`

### Method 2: Using Prisma Studio (Visual)

1. **Sign up** a regular account first (same as above)

2. **Open Prisma Studio**:
   ```bash
   npx prisma studio
   ```

3. **Navigate to UserRole table**

4. **Click "Add record"**

5. **Fill in the form**:
   - `userId`: Select your user from the dropdown
   - `role`: Select `ADMIN`
   - `isActive`: `true`
   - Click "Save 1 change"

6. **Sign out and sign back in** to refresh your session

7. **Access admin dashboard** at `/admin/dashboard`

### Method 3: Using SQL (Direct Database)

1. **Sign up** a regular account first (same as above)

2. **Find your user ID** from the User table

3. **Run this SQL query**:
   ```sql
   INSERT INTO "UserRole" (id, "userId", role, "isActive", "createdAt", "updatedAt")
   VALUES (gen_random_uuid(), 'your-user-id-here', 'ADMIN', true, NOW(), NOW());
   ```

4. **Sign out and sign back in** to refresh your session

5. **Access admin dashboard** at `/admin/dashboard`

## Admin Dashboard Features

Once you have admin access, you can:

- **View Statistics**: Total users, sellers, orders, revenue
- **Approve Sellers**: Review and approve/reject seller applications
- **Manage Disputes**: Handle order disputes
- **Release Escrow**: Manage payment escrow releases

## Admin Routes

- `/admin/dashboard` - Main admin dashboard
- `/admin/sellers` - Seller approval page

## Troubleshooting

### "Unauthorized" or Redirected to `/unauthorized`

- Make sure you have an `ADMIN` role assigned
- Sign out and sign back in to refresh your session
- Check that `isActive` is `true` for your admin role

### Can't See Admin Dashboard

- Verify your user has an `ADMIN` role in the database
- Check that the role `isActive` is set to `true`
- Clear your browser cache and cookies
- Try signing out and signing back in

### Script Not Working

If `npx tsx` doesn't work, install tsx first:
```bash
npm install -D tsx
```

Or use Prisma Studio (Method 2) instead.
