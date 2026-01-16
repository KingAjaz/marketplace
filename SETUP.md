# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Database

Create a PostgreSQL database and update your `.env` file:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/marketplace?schema=public"
```

### 3. Initialize Database

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 4. Set Up Authentication

Generate a NextAuth secret:

```bash
openssl rand -base64 32
```

Add to `.env`:
```env
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Configure OAuth (Optional)

For Google OAuth:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. **IMPORTANT**: Add the correct redirect URI:
   - For local development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://your-domain.vercel.app/api/auth/callback/google`
4. Add to `.env`:
```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

**For Vercel Deployment:**
1. Set `NEXTAUTH_URL` in Vercel environment variables to your production URL (e.g., `https://marketplace-pyg4.vercel.app`)
2. Ensure `NEXTAUTH_SECRET` is set in Vercel environment variables
3. In Google Cloud Console, add the redirect URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in Vercel environment variables

### 6. Configure Google Places API (Required for Address Autocomplete)

**📖 Detailed Guide**: See [GOOGLE_PLACES_SETUP.md](./GOOGLE_PLACES_SETUP.md) for complete step-by-step instructions.

**Quick Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API" and "Places API (New)" (APIs & Services → Library)
4. Create API key (APIs & Services → Credentials → Create Credentials → API key)
5. Restrict API key:
   - Application restrictions: HTTP referrers (`http://localhost:3000/*` for dev)
   - API restrictions: Places API, Places API (New)
6. Set up billing account (required, but $200 free credit/month)
7. Add to `.env`:
```env
GOOGLE_PLACES_API_KEY="your_google_places_api_key"
```

**Test the connection**: Visit `/api/places/test` to verify the API is working

### 7. Configure Paystack

1. Sign up at [Paystack](https://paystack.com/)
2. Get your API keys from dashboard
3. Add to `.env`:
```env
PAYSTACK_PUBLIC_KEY="pk_test_..."
PAYSTACK_SECRET_KEY="sk_test_..."
```

### 8. Configure Email Service (Optional but Recommended)

1. Sign up at [Resend](https://resend.com/)
2. Verify your domain
3. Get API key from Dashboard
4. Add to `.env`:
```env
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@yourdomain.com"
EMAIL_FROM_NAME="Your Marketplace Name"
```

**Note**: Email service works in development mode without API key (emails are logged to console)

### 9. Configure SMS Service (Optional - Currently Disabled)

For OTP delivery, choose one:

**Option A: Termii (Recommended for Nigeria)**
```env
SMS_API_KEY="your-termii-api-key"
SMS_API_URL="https://api.termii.com/api/sms/send"
```

**Option B: Twilio**
```env
SMS_API_KEY="your-twilio-auth-token"
SMS_API_URL="https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json"
```

### 10. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Creating Your First Admin User

After setting up the database, create an admin user:

1. Sign up normally through the UI
2. Complete phone verification
3. In Prisma Studio or database, update the user's role:

```sql
-- Find your user ID from the User table
-- Then create an admin role
INSERT INTO "UserRole" (id, "userId", role, "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'your-user-id', 'ADMIN', true, NOW(), NOW());
```

Or use Prisma Studio:
```bash
npx prisma studio
```

## Testing the Application

### As a Buyer:
1. Sign up and verify phone
2. Browse products at `/market`
3. Add items to cart
4. Checkout and complete payment (test mode)

### As a Seller:
1. Sign up and verify phone
2. Request seller role (needs admin approval)
3. Once approved, access seller dashboard
4. Create shop and add products

### As an Admin:
1. Use admin credentials
2. Access admin dashboard
3. Approve sellers
4. Manage disputes
5. Release escrow payments

## Production Deployment

### Environment Variables Checklist

- [ ] `DATABASE_URL` - Production PostgreSQL connection
- [ ] `NEXTAUTH_SECRET` - Strong random secret
- [ ] `NEXTAUTH_URL` - Your production domain
- [ ] `GOOGLE_PLACES_API_KEY` - Google Places API key (required for address autocomplete)
- [ ] `PAYSTACK_PUBLIC_KEY` & `PAYSTACK_SECRET_KEY` - Production Paystack keys
- [ ] `RESEND_API_KEY` - Email service API key (recommended)
- [ ] `EMAIL_FROM` & `EMAIL_FROM_NAME` - Email sender configuration
- [ ] `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Production OAuth credentials (optional)
- [ ] `SMS_API_KEY` & `SMS_API_URL` - Production SMS service (optional, currently disabled)
- [ ] `NODE_ENV=production`

### Database Migration

For production, use migrations instead of `db push`:

```bash
npx prisma migrate deploy
```

## Troubleshooting

### Prisma Client Not Generated
```bash
npx prisma generate
```

### Database Connection Issues
- Check `DATABASE_URL` format
- Ensure PostgreSQL is running
- Verify network/firewall settings

### Authentication Not Working
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Ensure OAuth redirect URIs are configured

### OTP Not Sending
- Check SMS service credentials
- Verify API endpoint URLs
- Check SMS service account balance
- In development, OTP is logged to console

### Payment Issues
- Verify Paystack keys are correct
- Check Paystack account status
- Ensure webhook URLs are configured (for production)

### Google Places API Not Working
- Verify `GOOGLE_PLACES_API_KEY` is set in `.env`
- Test the API connection: Visit `/api/places/test` in your browser
- Check Google Cloud Console:
  - Ensure Places API and Places API (New) are enabled
  - Verify API key restrictions allow your domain
  - Check API key billing/quota status
- Check browser console for error messages
- User can still enter addresses manually if API fails

## Next Steps

1. Customize branding and styling
2. Add more product categories
3. Configure delivery zones
4. Set up email notifications
5. Add analytics tracking
6. Implement real-time updates
7. Build mobile app using the API
