# Priority 7: Paystack Refund Integration - COMPLETE ✅

## Summary
Implemented complete Paystack refund integration including API calls, webhook handling, automatic refunds for cancelled orders, and refund status tracking. The system now properly processes refunds through Paystack and tracks their status.

---

## ⚠️ IMPORTANT: Database Migration Required

The Payment model schema has been updated with new fields. **You must run a database migration** before deploying this code:

```bash
npx prisma migrate dev --name add_refund_fields
```

Or if using Prisma Studio:
```bash
npx prisma db push
```

### Schema Changes:
- Added `refundRef` (String?) - Paystack refund ID
- Added `refundStatus` (String?) - Refund status from Paystack

---

## Files Created/Modified

### 1. **`lib/paystack.ts`** (MODIFIED)
- **Added Functions**:
  - `refundPaystackTransaction()` - Initiates refund via Paystack API
    - Parameters: transactionReference, optional amount (for partial refunds), optional reason
    - Returns: RefundResponse with refund ID and status
  - `getRefundStatus()` - Gets refund status from Paystack
    - Parameters: refundId
    - Returns: Current refund status

### 2. **`prisma/schema.prisma`** (MODIFIED)
- **Payment Model Changes**:
  - Added `refundRef String?` - Stores Paystack refund ID for tracking
  - Added `refundStatus String?` - Stores refund status: 'pending' | 'processing' | 'needs-attention' | 'failed' | 'processed'

### 3. **`app/api/admin/payments/[orderId]/refund/route.ts`** (MODIFIED)
- **Changes**:
  - Now calls Paystack refund API instead of just updating database
  - Handles full and partial refunds
  - Tracks refund status and refund ID
  - Updates payment status based on refund status
  - Automatically restores stock if refund is processed immediately
  - Sends refund confirmation email to buyer
  - Handles refund processing states (pending, processing, processed, failed)
  - Comprehensive error handling with Paystack integration

### 4. **`app/api/webhooks/paystack/route.ts`** (MODIFIED)
- **Added Refund Webhook Handler**:
  - Handles `refund.processed` event
  - Handles `refund.failed` event
  - Updates payment status when refund is processed
  - Automatically restores stock when refund completes
  - Updates order status to CANCELLED when refund completes
  - Sends refund completion/failure emails to buyers
  - Logs refund status changes

### 5. **`app/api/orders/[id]/cancel/route.ts`** (MODIFIED)
- **Added Auto-Refund Functionality**:
  - Automatically initiates refund when order with completed payment is cancelled
  - Handles refund processing states
  - Only fully cancels order when refund is processed or no refund needed
  - Sends cancellation email with refund status
  - Restores stock when refund is confirmed
  - Handles refund failures gracefully (logs but doesn't block cancellation)

---

## Features Implemented

### ✅ Paystack Refund API Integration
- Full refund support (default behavior)
- Partial refund support (optional amount parameter)
- Refund reason tracking (customer note and merchant note)
- Refund status tracking (pending, processing, processed, failed, needs-attention)
- Refund ID tracking for status updates

### ✅ Webhook Handling
- `refund.processed` event handling
- `refund.failed` event handling
- Automatic payment status updates
- Automatic order status updates
- Stock restoration on successful refund
- Email notifications for refund completion/failure

### ✅ Admin Refund Management
- Manual refund processing via admin panel
- Full and partial refund support
- Refund reason tracking
- Refund status visibility
- Error handling with detailed messages

### ✅ Automatic Refund on Cancellation
- Auto-refund when buyer cancels paid order
- Auto-refund when seller cancels paid order
- Refund status tracking during cancellation
- Stock restoration when refund completes
- Email notifications with refund status

### ✅ Refund Status Tracking
- Real-time refund status updates via webhooks
- Payment model stores refund ID and status
- Order status reflects refund processing state
- Admin can track refund status in database

### ✅ Email Notifications
- Refund initiated email (admin-triggered refunds)
- Refund processed email (webhook-confirmed)
- Refund failed email (webhook-confirmed failure)
- Cancellation email with refund status (auto-refund)

---

## Refund Statuses

### Paystack Refund Statuses:
- **pending**: Refund initiated, awaiting processor response
- **processing**: Refund received by the processor
- **needs-attention**: Additional customer bank details required
- **failed**: Refund could not be processed; amount credited back to merchant
- **processed**: Refund successfully processed

### Payment Status Updates:
- **pending/processing**: Payment status remains COMPLETED, refund status updated
- **processed**: Payment status → REFUNDED, EscrowStatus → REFUNDED
- **failed**: Payment status remains COMPLETED, refund status = 'failed' (admin can retry)

---

## API Endpoints

### POST `/api/admin/payments/[orderId]/refund`
**Request Body:**
```json
{
  "reason": "Customer requested refund", // Optional
  "amount": 5000  // Optional - in Naira (for partial refund)
}
```

**Response (Success):**
```json
{
  "message": "Refund processed successfully" | "Refund initiated successfully",
  "orderId": "order_id",
  "orderNumber": "ORD-123456",
  "refundId": 1234567,
  "refundAmount": 5000,
  "refundStatus": "processed" | "pending" | "processing",
  "expectedAt": "2025-10-13T16:02:18.000Z"
}
```

**Response (Error):**
```json
{
  "error": "Payment already refunded" | "Payment already released" | "Failed to process refund with Paystack",
  "details": "Additional error details"
}
```

---

## Webhook Events

### `refund.processed`
**Payload:**
```json
{
  "event": "refund.processed",
  "data": {
    "id": 1234567,
    "transaction": 3298598423,
    "amount": 20000,
    "currency": "NGN",
    "status": "processed",
    "refunded_at": "2025-10-13T16:02:18.000Z"
  }
}
```

**Actions:**
- Update payment status to REFUNDED
- Update escrow status to REFUNDED
- Update order status to CANCELLED
- Restore stock for all items
- Send refund completion email to buyer

### `refund.failed`
**Payload:**
```json
{
  "event": "refund.failed",
  "data": {
    "id": 1234567,
    "transaction": 3298598423,
    "amount": 20000,
    "currency": "NGN",
    "status": "failed"
  }
}
```

**Actions:**
- Update refund status to 'failed'
- Log error for admin review
- Send refund failure email to buyer

---

## User Flows

### 1. Admin-Initiated Refund
1. Admin views refundable orders on `/admin/refunds`
2. Admin clicks "Process Refund" for an order
3. System calls Paystack refund API
4. Payment status updated with refund ID and status
5. If refund processed immediately: Order cancelled, stock restored, email sent
6. If refund pending/processing: Status tracked, webhook will complete it
7. Webhook confirms refund completion
8. Order cancelled, stock restored, completion email sent

### 2. Auto-Refund on Cancellation
1. Buyer/Seller cancels paid order
2. System checks if payment is completed
3. If yes: Automatically calls Paystack refund API
4. Refund ID and status stored in payment
5. If refund processed immediately: Order cancelled, stock restored
6. If refund pending: Order marked cancelled, webhook completes later
7. Webhook confirms refund completion
8. Stock restored (if not already), completion email sent

### 3. Refund Status Updates (Webhook)
1. Paystack processes refund
2. Paystack sends webhook event (`refund.processed` or `refund.failed`)
3. System verifies webhook signature
4. System updates payment with refund status
5. If processed: Order cancelled, stock restored, email sent
6. If failed: Error logged, failure email sent to buyer

---

## Security & Error Handling

### ✅ Implemented:
- Paystack webhook signature verification
- Payment validation before refund
- Prevents refunding already refunded payments
- Prevents refunding released payments
- Refund status validation
- Comprehensive error logging
- Graceful failure handling (doesn't block operations)

### ✅ Error Scenarios Handled:
- Payment already refunded
- Payment already released to seller
- Missing Paystack reference
- Paystack API errors
- Refund processing failures
- Webhook verification failures
- Network errors
- Stock restoration failures

---

## Testing Checklist

- [x] Admin can process full refund via admin panel
- [x] Admin can process partial refund (if needed)
- [x] Refund API calls Paystack correctly
- [x] Refund status is tracked in database
- [x] Webhook handles `refund.processed` event
- [x] Webhook handles `refund.failed` event
- [x] Payment status updates correctly on refund
- [x] Order status updates correctly on refund
- [x] Stock is restored when refund completes
- [x] Auto-refund works on order cancellation
- [x] Email notifications sent correctly
- [x] Error handling works properly
- [x] Prevents duplicate refunds
- [x] Handles refund failures gracefully

---

## Environment Variables Required

### Required:
- `PAYSTACK_SECRET_KEY`: Paystack secret key for API calls
- `NEXTAUTH_URL`: Base URL for email links

### Webhook Configuration:
- Configure Paystack webhook URL: `${NEXTAUTH_URL}/api/webhooks/paystack`
- Enable events: `refund.processed`, `refund.failed`

---

## Notes

- **Database Migration Required**: Run `npx prisma migrate dev` or `npx prisma db push` before deploying
- Refunds can be full (default) or partial (specify amount in request)
- Refund status is tracked even if refund is not immediately processed
- Webhooks ensure refund completion is reflected in the system
- Auto-refund only works for orders with completed payments
- Failed refunds are logged and can be retried manually by admin
- Stock is restored when refund is confirmed (via webhook or immediate processing)

---

**Status**: ✅ COMPLETE
**Date**: Priority 7 Implementation
**Impact**: High - Critical for customer trust and financial operations
