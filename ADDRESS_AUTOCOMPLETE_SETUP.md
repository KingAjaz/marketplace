# Address Autocomplete & Location-Aware Store Discovery

This document describes the address autocomplete and location-based store discovery feature that has been added to the marketplace.

## Features Implemented

### 1. Address Autocomplete
- **Google Places Autocomplete** integration for address input
- Real-time suggestions while typing (300ms debounce)
- Server-side API calls to keep Google API key secure
- Automatically fills address fields when user selects a suggestion
- Saves full formatted address, coordinates, and parsed components

### 2. Location-Based Store Ranking
- Shops are automatically sorted by distance when user has a saved address
- Distance calculation using Haversine formula
- Distance displayed on shop cards (e.g., "2.5 km")
- Falls back to default sorting if user has no address

### 3. Database Schema Updates
- **Address model**: Added `addressText`, `latitude`, `longitude` fields
- **Shop model**: Added `latitude`, `longitude` fields
- Indexes added for efficient distance queries

## Setup Instructions

### 1. Environment Variables
Add to your `.env` file:
```env
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 2. Get Google Places API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Places API" and "Places API (New)"
4. Create credentials (API Key)
5. Restrict the API key to:
   - Application restrictions: HTTP referrers (for web)
   - API restrictions: Places API only

### 3. Database Migration
Run the database migration to add the new fields:
```bash
npx prisma db push
# or
npx prisma migrate dev --name add_location_fields
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

## API Routes

### `/api/places/autocomplete`
- **Method**: GET
- **Query params**: 
  - `input` (required): User's input text
  - `location` (optional): "lat,lng" for location bias
- **Returns**: Array of place predictions

### `/api/places/details`
- **Method**: GET
- **Query params**: 
  - `placeId` (required): Google Place ID
- **Returns**: Full address details including coordinates

## Components

### `AddressAutocomplete`
Reusable component for address input with autocomplete:
```tsx
<AddressAutocomplete
  value={address}
  onChange={(value) => setAddress(value)}
  onSelect={(details) => {
    // details contains: formattedAddress, latitude, longitude, street, city, state, etc.
  }}
  placeholder="Start typing your address..."
/>
```

## Usage

### For Users
1. **Adding Address**: When adding a new address, start typing in the "Full Address" field
2. **Select from Suggestions**: Click on a suggestion to auto-fill all address fields
3. **Location-Based Shopping**: Shops are automatically sorted by distance when you have a saved default address

### For Sellers
- When creating/editing shop details, you can add location coordinates
- This helps buyers find your shop more easily

## Security

- Google API key is stored server-side only
- All Places API calls go through Next.js API routes
- API key is never exposed to the client
- Input validation on both client and server

## Performance

- Debounced autocomplete (300ms) to reduce API calls
- Distance calculation uses efficient Haversine formula
- Database indexes on latitude/longitude for fast queries
- Caching headers on shops API response

## Notes

- Address autocomplete is restricted to Nigeria (`country:ng`)
- Distance is calculated in kilometers
- If a shop doesn't have coordinates, it appears after shops with coordinates
- Users without a default address see shops in default order (by creation date)
