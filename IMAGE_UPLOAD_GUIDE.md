# Image Upload Feature

## Overview

The marketplace now supports direct image file uploads in addition to URL input. Sellers can upload images from their device when creating or editing products, or updating shop settings.

## Features

✅ **File Upload Support**
- Upload images directly from device
- Supports all common image formats (JPG, PNG, GIF, WebP, etc.)
- Maximum file size: 5MB per image
- Automatic file validation

✅ **Dual Input Method**
- Upload files OR paste image URLs
- Flexible for different use cases
- Image preview before saving

✅ **Where It Works**
- Product creation (`/seller/products/new`)
- Product editing (`/seller/products/[id]/edit`)
- Shop settings (`/seller/shop`) - Logo and Banner

## How It Works

### For Products

1. **Add Product Page** (`/seller/products/new`):
   - Click the upload button (📤) next to each image field
   - Select an image file from your device
   - Image uploads automatically
   - Preview appears below the input
   - You can also paste a URL instead

2. **Edit Product Page** (`/seller/products/[id]/edit`):
   - Same upload functionality
   - Replace existing images or add new ones

### For Shop Settings

1. **Shop Settings Page** (`/seller/shop`):
   - Upload logo: Click upload button next to Logo URL field
   - Upload banner: Click upload button next to Banner URL field
   - Preview shows immediately after upload

## Technical Details

### Storage Location
- **Development**: Images stored in `public/uploads/` directory
- **Production**: Consider using cloud storage (see recommendations below)

### File Naming
- Files are automatically renamed with timestamp and random string
- Format: `{timestamp}-{random}.{extension}`
- Example: `1703123456789-abc123def456.jpg`

### API Endpoint
- **POST** `/api/upload`
- Requires authentication
- Returns: `{ url: "/uploads/filename.jpg", filename: "filename.jpg" }`

### Security
- ✅ Authentication required
- ✅ File type validation (images only)
- ✅ File size limit (5MB)
- ✅ Unique filenames prevent conflicts

## Production Recommendations

For production deployment, consider using cloud storage:

### Option 1: Cloudinary (Recommended)
- Free tier available
- Automatic image optimization
- CDN delivery
- Easy integration

### Option 2: AWS S3
- Scalable and reliable
- Cost-effective for large scale
- Requires AWS setup

### Option 3: Supabase Storage
- If already using Supabase
- Integrated with your existing setup
- Free tier available

### Option 4: Vercel Blob Storage
- If deploying on Vercel
- Seamless integration
- Simple API

## Migration to Cloud Storage

To migrate to cloud storage (e.g., Cloudinary):

1. Install the SDK:
   ```bash
   npm install cloudinary
   ```

2. Update `/api/upload/route.ts`:
   ```typescript
   import { v2 as cloudinary } from 'cloudinary'
   
   // Upload to Cloudinary instead of local storage
   const result = await cloudinary.uploader.upload(buffer, {
     folder: 'products',
   })
   
   return NextResponse.json({ url: result.secure_url })
   ```

3. Update `.env`:
   ```env
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

## File Structure

```
public/
  uploads/          # Created automatically
    {timestamp}-{random}.jpg
    {timestamp}-{random}.png
    ...
```

## Troubleshooting

### Upload Fails
- Check file size (must be < 5MB)
- Verify file is an image format
- Check server logs for errors
- Ensure `public/uploads` directory exists

### Images Not Displaying
- Verify the URL path is correct
- Check file permissions
- Ensure Next.js is serving static files from `public/`

### Production Issues
- Local file storage doesn't work on serverless platforms (Vercel, etc.)
- Must use cloud storage for production
- See migration guide above

## Current Limitations

- Local file storage (development only)
- No image optimization/resizing
- No drag-and-drop (click to upload)
- Single file upload at a time

## Future Enhancements

- [ ] Drag-and-drop upload
- [ ] Multiple file selection
- [ ] Image cropping/resizing
- [ ] Progress indicators
- [ ] Cloud storage integration
- [ ] Image compression
- [ ] Thumbnail generation
