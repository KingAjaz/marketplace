# Nigerian Marketplace - E-commerce Platform

A production-ready, same-day delivery marketplace for fresh foodstuffs, meat, processed foods, and live animals. Built with Next.js, TypeScript, Prisma, and PostgreSQL.

## 🚀 Features

- **Multi-role System**: Buyers, Sellers, Riders, and Admins
- **Phone Verification**: Mandatory OTP-based phone verification after signup
- **Seller Approval**: Admin-approved seller system with KYC
- **Dynamic Pricing**: Multiple pricing units per product (kg, bag, piece, etc.)
- **Escrow Payments**: Secure payment system with Paystack integration
- **Same-Day Delivery**: Chowdeck-style delivery management
- **Order Management**: Complete order lifecycle tracking
- **Dispute Resolution**: Built-in dispute management system
- **Reviews & Ratings**: Customer feedback system

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (Email/Password + OAuth)
- **Payments**: Paystack
- **State Management**: Zustand
- **UI Components**: Radix UI + shadcn/ui

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL database
- Paystack account (for payments)
- SMS service account (Termii, Twilio, etc.) for OTP

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd marketplace
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random secret for NextAuth (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL`: Your app URL (http://localhost:3000 for dev)
- `GOOGLE_PLACES_API_KEY`: For address autocomplete (required for checkout) - [Setup Guide](./GOOGLE_PLACES_SETUP.md)
- `PAYSTACK_PUBLIC_KEY` & `PAYSTACK_SECRET_KEY`: For payment processing
- `RESEND_API_KEY`: For email notifications (optional, works in dev mode without key)

Optional variables:
- `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: For Google OAuth (optional)
- `SMS_API_KEY` & `SMS_API_URL`: For SMS notifications (currently disabled)

### 3. Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
marketplace/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── products/     # Product management
│   │   ├── orders/       # Order processing
│   │   ├── seller/       # Seller dashboard APIs
│   │   ├── admin/        # Admin dashboard APIs
│   │   └── rider/        # Rider dashboard APIs
│   ├── auth/             # Auth pages (signin, signup, profile)
│   ├── market/           # Marketplace browsing
│   ├── cart/             # Shopping cart
│   ├── checkout/         # Checkout flow
│   ├── seller/           # Seller dashboard
│   ├── admin/            # Admin dashboard
│   └── rider/            # Rider dashboard
├── components/           # React components
│   └── ui/               # Reusable UI components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
│   ├── auth.ts          # NextAuth configuration
│   ├── prisma.ts        # Prisma client
│   └── utils.ts         # Helper functions
├── prisma/               # Database schema
│   └── schema.prisma    # Prisma schema definition
└── types/               # TypeScript type definitions
```

## 🔐 Authentication Flow

1. **Signup**: User signs up with email/password or Google OAuth
2. **Phone Verification**: User is redirected to complete profile
3. **OTP Verification**: Phone number verified via OTP
4. **Access Granted**: User can now place orders, sell, or request delivery

## 💳 Payment Flow

1. Buyer adds items to cart
2. Buyer proceeds to checkout
3. Order created with `PENDING` status
4. Payment initialized via Paystack
5. Payment verified and funds held in escrow
6. Order status updated to `PAID`
7. Seller prepares order
8. Rider delivers order
9. Buyer confirms delivery
10. Admin releases escrow to seller (minus platform commission)

## 🎯 User Roles

### Buyer
- Browse products
- Add to cart and checkout
- Track orders
- Leave reviews

### Seller (Admin-approved)
- Create and manage shop
- Add/edit products with dynamic pricing
- Manage orders
- View earnings

### Rider
- Accept delivery assignments
- Update delivery status
- Track active deliveries

### Admin
- Approve/reject sellers
- Manage disputes
- Release escrow payments
- Platform analytics

## 📱 Mobile App Extension

The API-first architecture allows easy extension to mobile apps:

- All endpoints are RESTful and can be consumed by React Native, Flutter, or native apps
- Authentication uses JWT tokens compatible with mobile apps
- WebSocket support can be added for real-time updates

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Database

Use a managed PostgreSQL service:
- **Vercel Postgres**: Integrated with Vercel
- **Supabase**: Free tier available
- **Neon**: Serverless PostgreSQL
- **Railway**: Easy PostgreSQL hosting

### Environment Variables

Set all environment variables in your deployment platform.

## 🔒 Security Considerations

- Phone numbers are validated and normalized
- Passwords are hashed with bcrypt
- Payments use escrow system
- Role-based access control (RBAC)
- Middleware protects routes
- SQL injection prevented by Prisma

## 📝 TODO / Future Enhancements

- [ ] Real-time order updates with WebSockets
- [ ] Push notifications for order status
- [ ] Advanced search and filters
- [ ] Seller analytics dashboard
- [ ] Bulk order management
- [ ] Inventory management
- [ ] Delivery tracking map integration
- [ ] Multi-language support
- [ ] Mobile app (React Native)

## 🤝 Contributing

This is a production-ready template. Customize as needed for your specific requirements.

## 📄 License

MIT License - feel free to use this for your projects.

## 🆘 Support

For issues or questions:
1. Check the Prisma schema for data models
2. Review API routes for endpoint documentation
3. Check middleware.ts for route protection logic

---

**Built with ❤️ for the Nigerian marketplace**
