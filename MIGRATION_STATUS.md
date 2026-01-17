# Supabase Auth Migration Status

## ✅ Completed
- [x] Signin/Signup pages using Supabase Auth for Google OAuth
- [x] Middleware migrated to Supabase Auth
- [x] Created Supabase Auth utilities (`lib/auth-supabase.ts`)
- [x] OAuth callback handler (`app/auth/callback/route.ts`)

## ⚠️ Still Using NextAuth (Need Migration)

### API Routes (20+ files)
These routes still use `getServerSession(authOptions)` from NextAuth and need to be migrated:

1. `app/api/admin/users/route.ts`
2. `app/api/admin/analytics/route.ts`
3. `app/api/admin/deliveries/route.ts`
4. `app/api/admin/disputes/route.ts`
5. `app/api/admin/payments/[orderId]/refund/route.ts`
6. `app/api/admin/sellers/pending/route.ts`
7. `app/api/admin/shops/route.ts`
8. `app/api/admin/stats/route.ts`
9. `app/api/seller/analytics/route.ts`
10. `app/api/seller/application/status/route.ts`
11. `app/api/seller/products/import/route.ts`
12. `app/api/seller/stats/route.ts`
13. `app/api/rider/earnings/route.ts`
14. `app/api/rider/status/route.ts`
15. `app/api/orders/route.ts`
16. `app/api/orders/[id]/cancel/route.ts`
17. `app/api/wishlist/check/route.ts`
18. `app/api/shops/route.ts`
19. `app/api/shops/search/route.ts`
20. `app/api/notifications/route.ts`
21. `app/api/disputes/route.ts`
22. `app/api/account/change-email/route.ts`
23. `app/api/auth/verify-phone/send-otp/route.ts`
24. `app/api/auth/verify-phone/verify-otp/route.ts`

### Migration Pattern
Replace:
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const session = await getServerSession(authOptions)
if (!session?.user?.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const userId = session.user.id
```

With:
```typescript
import { getCurrentUser } from '@/lib/auth-supabase'

const user = await getCurrentUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const userId = user.id
// Also get roles: user.roles, phoneNumber: user.phoneNumber, etc.
```

## 🗑️ To Remove After Migration
- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route
- `lib/auth.ts` - NextAuth configuration (or keep for reference)
- `NEXTAUTH_SECRET` environment variable
- `NEXTAUTH_URL` environment variable (unless still needed for email links)

## Current State
- **Google OAuth**: ✅ Using Supabase Auth
- **Email/Password**: Still using NextAuth (signup creates in Prisma, signin uses NextAuth)
- **Middleware**: ✅ Using Supabase Auth
- **API Routes**: ⚠️ Still using NextAuth (20+ routes)
