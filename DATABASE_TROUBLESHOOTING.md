# Database Connection Troubleshooting

## Issue: Can't reach database server

### For Supabase Databases:

1. **Check if your database is paused:**
   - Go to your Supabase dashboard: https://supabase.com/dashboard
   - Check if your project shows "Paused" status
   - If paused, click "Restore" to wake it up
   - Wait 1-2 minutes for it to fully start

2. **Use the correct connection string:**
   
   Supabase provides different connection strings:
   
   **Option A: Direct Connection (for migrations)**
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
   
   **Option B: Connection Pooler (recommended for production)**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   
   **Option C: Transaction Pooler (for migrations)**
   ```
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true
   ```

3. **Get your connection string from Supabase:**
   - Go to: Settings → Database
   - Copy the "Connection string" under "Connection parameters"
   - Use the "URI" format
   - Make sure to replace `[YOUR-PASSWORD]` with your actual database password

4. **For Prisma migrations, use the Transaction Pooler URL:**
   - The transaction pooler (port 5432) is better for migrations
   - The session pooler (port 6543) is better for application connections

### Quick Fix Steps:

1. **Wake up your Supabase database:**
   ```bash
   # Go to Supabase dashboard and restore if paused
   ```

2. **Update your .env file with the correct connection string:**
   ```env
   # Use Transaction Pooler for migrations (port 5432)
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true"
   ```

3. **Test the connection:**
   ```bash
   npx prisma db push
   ```

### Alternative: Use Direct Connection

If pooler doesn't work, try the direct connection:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

### Common Issues:

- **"Can't reach database server"**: Database is paused or connection string is wrong
- **"Connection timeout"**: Database is paused or network issue
- **"Authentication failed"**: Wrong password in connection string
- **"Database does not exist"**: Wrong database name (should be "postgres" for Supabase)

### Still Having Issues?

1. Check Supabase dashboard for project status
2. Verify your database password is correct
3. Try the direct connection URL instead of pooler
4. Check if your IP is allowed (Supabase allows all by default)
5. Try from a different network to rule out firewall issues
