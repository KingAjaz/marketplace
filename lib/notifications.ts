/**
 * Notification Helper Functions
 * 
 * Centralized notification creation with email support
 */
import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'
import { sendEmail, getOrderConfirmationEmail, getPaymentConfirmationEmail, getOrderStatusUpdateEmail, getPaymentReceivedEmail, getDeliveryAssignedEmail } from './email'

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        link,
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

/**
 * Create notification for order placed
 */
export async function notifyOrderPlaced(orderId: string, buyerId: string, shopUserId: string, orderNumber: string) {
  // Validate inputs
  if (!orderId || !buyerId || !shopUserId || !orderNumber) {
    console.error('notifyOrderPlaced: Missing required parameters', { orderId, buyerId, shopUserId, orderNumber })
    return
  }

  // Fetch order details for email
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
          pricingUnit: { select: { unit: true } },
        },
      },
      buyer: { select: { email: true, name: true } },
      shop: { select: { userId: true, name: true } },
    },
  })

  if (!order) {
    console.error('notifyOrderPlaced: Order not found', { orderId })
    return
  }

  // Fetch seller email
  const seller = shopUserId ? await prisma.user.findUnique({
    where: { id: shopUserId },
    select: { email: true },
  }).catch((error) => {
    console.error('notifyOrderPlaced: Failed to fetch seller', { shopUserId, error })
    return null
  }) : null

  // Only notify seller when order is created (buyer will be notified after payment)
  await Promise.all([
    createNotification(
      shopUserId,
      NotificationType.ORDER_PLACED,
      'New Order Received',
      `You have received a new order: #${orderNumber}. Waiting for payment confirmation.`,
      `/seller/orders/${orderId}`
    ),
    // Don't notify buyer yet - they will be notified after payment is confirmed
    // Send email to seller only
    seller?.email
      ? sendEmail({
          to: seller.email,
          subject: `New Order Received - #${orderNumber}`,
          html: `
            <p>You have received a new order: <strong>#${orderNumber}</strong></p>
            <p>Please wait for payment confirmation before processing the order.</p>
            <p><a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/orders/${orderId}">View Order</a></p>
          `,
        })
      : Promise.resolve(),
  ])
}

/**
 * Create notification for order status update
 */
export async function notifyOrderStatusUpdate(
  orderId: string,
  buyerId: string,
  shopUserId: string,
  orderNumber: string,
  status: string
) {
  // Fetch buyer email
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { email: true },
  })

  await Promise.all([
    createNotification(
      buyerId,
      NotificationType.ORDER_STATUS_UPDATE,
      'Order Status Updated',
      `Your order #${orderNumber} status has been updated to: ${status.replace('_', ' ')}`,
      `/orders/${orderId}`
    ),
    // Send email
    buyer?.email
      ? sendEmail({
          to: buyer.email,
          ...getOrderStatusUpdateEmail(orderNumber, status, orderId),
        })
      : Promise.resolve(),
  ])
}

/**
 * Create notification for payment received
 */
export async function notifyPaymentReceived(shopUserId: string, orderNumber: string, amount: number) {
  // Fetch seller email
  const seller = await prisma.user.findUnique({
    where: { id: shopUserId },
    select: { email: true },
  })

  await Promise.all([
    createNotification(
      shopUserId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received',
      `Payment of ₦${amount.toLocaleString()} received for order #${orderNumber}`,
      `/seller/orders`
    ),
    // Send email
    seller?.email
      ? sendEmail({
          to: seller.email,
          ...getPaymentReceivedEmail(orderNumber, amount),
        })
      : Promise.resolve(),
  ])
}

/**
 * Create notification for payment released
 */
export async function notifyPaymentReleased(shopUserId: string, orderNumber: string, amount: number) {
  await createNotification(
    shopUserId,
    NotificationType.PAYMENT_RELEASED,
    'Payment Released',
    `Payment of ₦${amount.toLocaleString()} has been released for order #${orderNumber}`,
    `/seller/orders`
  )
}

/**
 * Create notification for dispute
 */
export async function notifyDisputeCreated(
  disputeId: string,
  buyerId: string,
  sellerId: string,
  orderNumber: string
) {
  await Promise.all([
    createNotification(
      sellerId,
      NotificationType.DISPUTE_CREATED,
      'Dispute Created',
      `A dispute has been created for order #${orderNumber}`,
      `/seller/disputes`
    ),
    createNotification(
      buyerId,
      NotificationType.DISPUTE_CREATED,
      'Dispute Submitted',
      `Your dispute for order #${orderNumber} has been submitted and is under review`,
      `/orders/${disputeId}`
    ),
  ])
}

/**
 * Create notification for delivery assignment
 */
export async function notifyDeliveryAssigned(riderId: string, orderNumber: string, orderId: string) {
  // Fetch rider email and order details
  const [rider, order] = await Promise.all([
    prisma.user.findUnique({
      where: { id: riderId },
      select: { email: true },
    }),
    prisma.order.findUnique({
      where: { id: orderId },
      select: { deliveryAddress: true },
    }),
  ])

  await Promise.all([
    createNotification(
      riderId,
      NotificationType.DELIVERY_ASSIGNED,
      'New Delivery Assigned',
      `You have been assigned to deliver order #${orderNumber}`,
      `/rider/deliveries/${orderId}`
    ),
    // Send email
    rider?.email && order
      ? sendEmail({
          to: rider.email,
          ...getDeliveryAssignedEmail(orderNumber, order.deliveryAddress, orderId),
        })
      : Promise.resolve(),
  ])
}
