# How to Get Google Places API Key

This guide will walk you through obtaining a Google Places API key for address autocomplete functionality.

## Step-by-Step Instructions

### Step 1: Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account (or create one if you don't have it)
3. Accept the terms of service if prompted

### Step 2: Create or Select a Project

1. Click on the project dropdown at the top of the page (next to "Google Cloud")
2. Click **"New Project"**
3. Enter a project name (e.g., "Marketplace App")
4. Click **"Create"**
5. Wait for the project to be created (usually takes a few seconds)
6. Select the newly created project from the dropdown

**OR** if you already have a project:
- Simply select it from the project dropdown

### Step 3: Enable Places API

1. In the Google Cloud Console, click the **hamburger menu** (☰) in the top left
2. Navigate to **"APIs & Services"** → **"Library"**
3. In the search bar, type **"Places API"**
4. Click on **"Places API"** (the one with the map icon)
5. Click the **"Enable"** button
6. Wait for it to enable (takes a few seconds)

**Important**: Also enable **"Places API (New)"**:
1. Go back to the API Library
2. Search for **"Places API (New)"**
3. Click on it and click **"Enable"**

### Step 4: Create API Key

1. Go to **"APIs & Services"** → **"Credentials"** (from the left sidebar)
2. Click **"+ CREATE CREDENTIALS"** at the top
3. Select **"API key"** from the dropdown
4. A new API key will be created and displayed in a popup
5. **Copy the API key** - you'll need it for your `.env` file

**⚠️ Important**: Don't close the popup yet! You need to restrict the key first.

### Step 5: Restrict the API Key (Recommended for Security)

1. In the API key popup, click **"Restrict key"** (or click "Edit API key" if you closed the popup)
2. Under **"Application restrictions"**:
   - Select **"HTTP referrers (web sites)"**
   - Click **"Add an item"**
   - Add your domains:
     - For development: `http://localhost:3000/*`
     - For production: `https://yourdomain.com/*` and `https://www.yourdomain.com/*`
3. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check the boxes for:
     - ✅ **Places API**
     - ✅ **Places API (New)**
4. Click **"Save"**

### Step 6: Set Up Billing (Required)

**Note**: Google Places API requires a billing account, but you get $200 free credit per month.

1. Go to **"Billing"** in the left sidebar
2. Click **"Link a billing account"** or **"Create billing account"**
3. Fill in your billing information:
   - Country/Region
   - Account name
   - Payment method (credit card)
4. Complete the setup

**Free Tier**: Google provides $200 free credit per month, which covers approximately:
- ~40,000 Autocomplete requests
- ~40,000 Place Details requests

After the free tier, pricing is:
- $2.83 per 1,000 Autocomplete requests
- $2.83 per 1,000 Place Details requests

### Step 7: Add API Key to Your Project

1. Open your project's `.env` file (or create one if it doesn't exist)
2. Add the following line:

```env
GOOGLE_PLACES_API_KEY="your_api_key_here"
```

**Replace `your_api_key_here` with the actual API key you copied in Step 4.**

3. Save the `.env` file
4. **Restart your development server** for the changes to take effect:

```bash
# Stop the server (Ctrl+C) and restart
npm run dev
```

### Step 8: Test the Connection

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Visit the test endpoint in your browser:
   ```
   http://localhost:3000/api/places/test
   ```

3. You should see a JSON response like:
   ```json
   {
     "configured": true,
     "working": true,
     "status": "OK",
     "predictionsCount": 5,
     "message": "Google Places API is properly configured and working",
     "testQuery": "Lagos, Nigeria",
     "samplePredictions": [...]
   }
   ```

4. Test in the UI:
   - Go to `/checkout` or `/account/addresses`
   - Start typing an address (e.g., "Lagos")
   - You should see autocomplete suggestions appear

## Troubleshooting

### API Key Not Working

**Error: "Places API not configured"**
- ✅ Check that `GOOGLE_PLACES_API_KEY` is in your `.env` file
- ✅ Make sure there are no extra spaces or quotes around the key
- ✅ Restart your development server after adding the key

**Error: "API key not valid" or "This API key is not authorized"**
- ✅ Check that Places API and Places API (New) are enabled in Google Cloud Console
- ✅ Verify API key restrictions allow your domain
- ✅ Make sure billing is set up

**Error: "This API project is not authorized to use this API"**
- ✅ Go to APIs & Services → Library
- ✅ Search for "Places API" and ensure it's enabled
- ✅ Search for "Places API (New)" and ensure it's enabled

**No suggestions appearing**
- ✅ Check browser console for errors
- ✅ Visit `/api/places/test` to see detailed error messages
- ✅ Verify the API key is correct
- ✅ Check that billing account is active

### Billing Issues

**"Billing account required"**
- ✅ You must set up a billing account (even if you stay within free tier)
- ✅ Google provides $200 free credit per month
- ✅ You won't be charged unless you exceed the free tier

**Check your usage:**
1. Go to Google Cloud Console → APIs & Services → Dashboard
2. View API usage and quotas
3. Monitor your usage to stay within free tier

## Quick Reference

**API Key Format**: 
```
AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Required APIs to Enable**:
- ✅ Places API
- ✅ Places API (New)

**Environment Variable**:
```env
GOOGLE_PLACES_API_KEY="AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

**Test Endpoint**: 
```
http://localhost:3000/api/places/test
```

## Security Best Practices

1. **Always restrict your API key**:
   - Set HTTP referrer restrictions
   - Limit to specific APIs (Places API only)

2. **Never commit API keys to Git**:
   - Keep `.env` in `.gitignore`
   - Use environment variables in production

3. **Monitor usage**:
   - Set up billing alerts
   - Monitor API usage in Google Cloud Console

4. **Rotate keys if compromised**:
   - Create a new key
   - Update your `.env` file
   - Delete the old key

## Cost Estimation

For a typical marketplace:
- **Small scale** (< 1,000 orders/month): Well within free tier
- **Medium scale** (1,000-10,000 orders/month): May use $10-50/month
- **Large scale** (> 10,000 orders/month): Monitor usage closely

**Tip**: Implement caching to reduce API calls and costs.

## Support Resources

- **Google Places API Documentation**: https://developers.google.com/maps/documentation/places/web-service
- **Google Cloud Console**: https://console.cloud.google.com/
- **API Pricing**: https://mapsplatform.google.com/pricing/
- **Support**: https://cloud.google.com/support

---

**Last Updated**: 2025-01-10
