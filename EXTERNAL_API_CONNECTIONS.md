# External API Connections & Configuration

This document lists all external APIs integrated into the marketplace platform, their connection status, configuration requirements, and usage.

## ✅ Connected & Working APIs

### 1. **Google Places API** ✅
**Status**: Fully Connected & Working

**Endpoints Used**:
- `/api/places/autocomplete` - Address autocomplete suggestions
- `/api/places/details` - Get place details with coordinates

**Configuration Required**:
```env
GOOGLE_PLACES_API_KEY=your_google_places_api_key
```

**Usage**:
- Used in `AddressAutocomplete` component
- Integrated in checkout page (`/checkout`)
- Integrated in address management (`/account/addresses`)

**Features**:
- ✅ Server-side API key protection
- ✅ Restricted to Nigeria (`country:ng`)
- ✅ Location bias support for nearby results
- ✅ Error handling for missing API key
- ✅ Graceful fallback on errors

**API Documentation**: 
- Autocomplete: https://developers.google.com/maps/documentation/places/web-service/autocomplete
- Details: https://developers.google.com/maps/documentation/places/web-service/details

---

### 2. **Paystack Payment API** ✅
**Status**: Fully Connected & Working

**Endpoints Used**:
- `https://api.paystack.co/transaction/initialize` - Initialize payment
- `https://api.paystack.co/transaction/verify/{reference}` - Verify payment
- `https://api.paystack.co/refund` - Process refunds
- `https://api.paystack.co/refund/{id}` - Get refund status

**Configuration Required**:
```env
PAYSTACK_PUBLIC_KEY=pk_test_... or pk_live_...
PAYSTACK_SECRET_KEY=sk_test_... or sk_live_...
```

**Usage**:
- Payment initialization in `/api/orders/[id]/payment`
- Payment verification in `/api/orders/[id]/payment/verify`
- Webhook handling in `/api/webhooks/paystack`
- Refund processing in `/api/admin/payments/[orderId]/refund`

**Features**:
- ✅ Full payment lifecycle (initialize, verify, refund)
- ✅ Webhook support for async payment updates
- ✅ Escrow system integration
- ✅ Error handling and retry logic
- ✅ Test and production mode support

**API Documentation**: https://paystack.com/docs/api/

---

### 3. **Resend Email API** ✅
**Status**: Connected (Optional - Works in Dev Mode Without Key)

**Endpoints Used**:
- `resend.emails.send()` - Send transactional emails

**Configuration Required**:
```env
RESEND_API_KEY=re_... (optional - emails logged in dev mode)
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Marketplace Name
EMAIL_PROVIDER=resend (default)
ENABLE_EMAIL_IN_DEV=false (set to true to send emails in development)
```

**Usage**:
- Order confirmations
- Payment confirmations
- Order status updates
- Payment received notifications
- Delivery assignment notifications
- Email verification
- Password reset

**Features**:
- ✅ Development mode logging (doesn't require API key)
- ✅ HTML email templates
- ✅ Error handling
- ✅ Support for multiple recipients
- ⚠️ SendGrid and AWS SES mentioned but not implemented

**API Documentation**: https://resend.com/docs

---

### 4. **SMS Service (Termii/Twilio)** ⚠️
**Status**: Partially Connected (Currently Disabled)

**Configuration Required**:
```env
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.termii.com/api/sms/send (or Twilio URL)
SMS_PROVIDER=termii (or twilio)
TWILIO_ACCOUNT_SID=... (if using Twilio)
TWILIO_PHONE_NUMBER=... (if using Twilio)
```

**Usage**:
- Phone verification OTP (currently disabled - phone verification not required)
- Order status SMS notifications (not implemented)

**Features**:
- ✅ Code exists in `lib/sms.ts`
- ⚠️ Currently disabled (phone verification not required per AUTHENTICATION_UPDATE.md)
- ⚠️ SMS notifications not implemented

**API Documentation**:
- Termii: https://termii.com/developers
- Twilio: https://www.twilio.com/docs

---

## 📋 Environment Variables Summary

### Required for Production:
```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://yourdomain.com

# Google Places (Required for address autocomplete)
GOOGLE_PLACES_API_KEY=...

# Paystack (Required for payments)
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# Email (Recommended)
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
EMAIL_FROM_NAME=Your Marketplace Name
```

### Optional:
```env
# Google OAuth (Optional)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# SMS Service (Optional - Currently Disabled)
SMS_API_KEY=...
SMS_API_URL=...
SMS_PROVIDER=termii

# Email Development Mode
ENABLE_EMAIL_IN_DEV=false
```

---

## 🔧 API Configuration Status

### ✅ Fully Configured & Working:
1. **Google Places API** - ✅ Connected, error handling, Nigeria restriction
2. **Paystack API** - ✅ Connected, full payment flow, webhooks, refunds
3. **Resend Email API** - ✅ Connected, dev mode support, templates

### ⚠️ Partially Configured:
1. **SMS Service** - Code exists but disabled (phone verification not required)

### ❌ Not Implemented:
1. **SendGrid Email** - Mentioned in code but not implemented
2. **AWS SES Email** - Mentioned in code but not implemented

---

## 🚀 Setup Instructions

### Google Places API Setup:
**📖 For detailed step-by-step instructions, see [GOOGLE_PLACES_SETUP.md](./GOOGLE_PLACES_SETUP.md)**

**Quick Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API" and "Places API (New)" (APIs & Services → Library)
4. Create API key (APIs & Services → Credentials → Create Credentials → API key)
5. Restrict API key:
   - Application restrictions: HTTP referrers (`http://localhost:3000/*` for dev, `https://yourdomain.com/*` for production)
   - API restrictions: Places API, Places API (New)
6. Set up billing account (required, but $200 free credit/month)
7. Add to `.env`: `GOOGLE_PLACES_API_KEY=your_key`
8. Restart your development server
9. Test: Visit `/api/places/test` to verify connection

### Paystack Setup:
1. Sign up at [Paystack](https://paystack.com/)
2. Get API keys from Dashboard → Settings → API Keys & Webhooks
3. Add to `.env`:
   - `PAYSTACK_PUBLIC_KEY=pk_test_...` (for testing)
   - `PAYSTACK_SECRET_KEY=sk_test_...` (for testing)
4. Configure webhook URL in Paystack dashboard:
   - `https://yourdomain.com/api/webhooks/paystack`
5. For production, use live keys (`pk_live_...` and `sk_live_...`)

### Resend Email Setup:
1. Sign up at [Resend](https://resend.com/)
2. Verify your domain
3. Get API key from Dashboard
4. Add to `.env`:
   - `RESEND_API_KEY=re_...`
   - `EMAIL_FROM=noreply@yourdomain.com`
   - `EMAIL_FROM_NAME=Your Marketplace Name`

### SMS Service Setup (Optional):
1. **Termii** (Recommended for Nigeria):
   - Sign up at [Termii](https://termii.com/)
   - Get API key
   - Add to `.env`:
     - `SMS_API_KEY=your_key`
     - `SMS_API_URL=https://api.termii.com/api/sms/send`
     - `SMS_PROVIDER=termii`

2. **Twilio**:
   - Sign up at [Twilio](https://www.twilio.com/)
   - Get Account SID, Auth Token, and Phone Number
   - Add to `.env`:
     - `SMS_API_KEY=your_auth_token`
     - `SMS_API_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json`
     - `SMS_PROVIDER=twilio`
     - `TWILIO_ACCOUNT_SID=...`
     - `TWILIO_PHONE_NUMBER=...`

---

## 🛡️ Security Best Practices

### Google Places API:
- ✅ API key stored server-side only
- ✅ Restricted to Nigeria (`country:ng`)
- ✅ Should restrict API key in Google Cloud Console

### Paystack:
- ✅ Secret key stored server-side only
- ✅ Public key safe for client-side use
- ✅ Webhook signature verification implemented

### Email Service:
- ✅ API key stored server-side only
- ✅ Development mode doesn't require key

### SMS Service:
- ✅ API key stored server-side only
- ⚠️ Currently disabled (not in use)

---

## 📊 API Usage & Limits

### Google Places API:
- **Free Tier**: $200 credit/month (covers ~40,000 autocomplete requests)
- **Pricing**: $2.83 per 1,000 autocomplete requests after free tier
- **Rate Limits**: 10 requests/second (can be increased)

### Paystack:
- **Test Mode**: Unlimited test transactions
- **Production**: Transaction fees apply (1.5% + ₦100 per transaction)
- **Rate Limits**: 10,000 requests/hour

### Resend:
- **Free Tier**: 3,000 emails/month
- **Pricing**: $20/month for 50,000 emails
- **Rate Limits**: 100 emails/second

### Termii:
- **Pricing**: Pay-as-you-go (varies by country)
- **Rate Limits**: Varies by plan

---

## 🔍 Error Handling Status

### Google Places API:
- ✅ Missing API key detection
- ✅ Invalid input validation
- ✅ API error response handling
- ✅ Graceful fallback (returns error to client)

### Paystack:
- ✅ Missing API key detection
- ✅ Payment initialization errors
- ✅ Payment verification errors
- ✅ Refund errors
- ✅ Webhook signature verification

### Resend Email:
- ✅ Missing API key detection (logs warning)
- ✅ Development mode fallback
- ✅ Email sending errors
- ✅ Multiple provider support (structure ready)

### SMS Service:
- ✅ Missing API key detection
- ⚠️ Currently disabled

---

## 🎯 Recommendations

### Immediate Actions:
1. ✅ **Google Places API** - Already properly configured
2. ✅ **Paystack** - Already properly configured
3. ✅ **Resend Email** - Already properly configured

### Future Enhancements:
1. **SMS Notifications** - Enable when needed:
   - Order status updates via SMS
   - Delivery notifications
   - OTP verification (if re-enabled)

2. **Additional Email Providers**:
   - Implement SendGrid support
   - Implement AWS SES support

3. **API Monitoring**:
   - Add rate limiting monitoring
   - Add error tracking (Sentry, etc.)
   - Add usage analytics

4. **Fallback Mechanisms**:
   - Email fallback if Resend fails
   - Payment retry logic improvements
   - Address autocomplete fallback (manual entry)

---

## 📝 Testing Checklist

### Google Places API:
- [x] Autocomplete suggestions work
- [x] Place details retrieval works
- [x] Error handling works (missing API key)
- [x] Nigeria restriction works
- [x] Location bias works

### Paystack:
- [x] Payment initialization works
- [x] Payment verification works
- [x] Webhook handling works
- [x] Refund processing works
- [x] Error handling works

### Resend Email:
- [x] Email sending works (with API key)
- [x] Development mode logging works
- [x] Error handling works
- [x] Email templates render correctly

### SMS Service:
- [ ] OTP sending (currently disabled)
- [ ] SMS notifications (not implemented)

---

## 🔗 API Documentation Links

- **Google Places API**: https://developers.google.com/maps/documentation/places/web-service
- **Paystack API**: https://paystack.com/docs/api/
- **Resend API**: https://resend.com/docs
- **Termii API**: https://termii.com/developers
- **Twilio API**: https://www.twilio.com/docs

---

## 📞 Support

If you encounter issues with any external API:

1. **Google Places**: Check API key restrictions and billing
2. **Paystack**: Verify webhook URL and API keys
3. **Resend**: Check domain verification and API key
4. **SMS**: Verify API credentials and account balance

---

**Last Updated**: 2025-01-10
**Status**: All critical APIs connected and working ✅
