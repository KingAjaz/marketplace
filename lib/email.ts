/**
 * Email Service
 * 
 * Handles sending transactional emails using Resend
 * Supports multiple email providers (Resend, SendGrid, AWS SES)
 */
import { Resend } from 'resend'

// Email configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend' // 'resend', 'sendgrid', 'ses'
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@marketplace.com'
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Nigerian Marketplace'

// Initialize Resend client
let resend: Resend | null = null
if (EMAIL_PROVIDER === 'resend') {
  const apiKey = process.env.RESEND_API_KEY
  if (apiKey) {
    resend = new Resend(apiKey)
  } else {
    console.warn('Resend API key not configured. Emails will not be sent.')
  }
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Send email using configured provider
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text } = options

  // In development, log email instead of sending (unless explicitly enabled)
  const isDevelopment = process.env.NODE_ENV === 'development'
  const enableEmailInDev = process.env.ENABLE_EMAIL_IN_DEV === 'true'

  if (isDevelopment && !enableEmailInDev) {
    console.log('='.repeat(60))
    console.log('[EMAIL] Development mode - Email not sent (set ENABLE_EMAIL_IN_DEV=true to enable)')
    console.log('To:', Array.isArray(to) ? to.join(', ') : to)
    console.log('Subject:', subject)
    console.log('HTML:', html)
    if (text) console.log('Text:', text)
    console.log('='.repeat(60))
    return { success: true }
  }

  try {
    if (EMAIL_PROVIDER === 'resend') {
      if (!resend) {
        return { success: false, error: 'Resend not configured' }
      }

      const recipients = Array.isArray(to) ? to : [to]
      const result = await resend.emails.send({
        from: `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
        to: recipients,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      })

      if (result.error) {
        console.error('Resend email error:', result.error)
        return { success: false, error: result.error.message || 'Failed to send email' }
      }

      console.log(`[EMAIL] Sent successfully to ${recipients.join(', ')}`)
      return { success: true }
    } else if (EMAIL_PROVIDER === 'sendgrid') {
      // TODO: Implement SendGrid
      console.warn('SendGrid not yet implemented')
      return { success: false, error: 'SendGrid not implemented' }
    } else if (EMAIL_PROVIDER === 'ses') {
      // TODO: Implement AWS SES
      console.warn('AWS SES not yet implemented')
      return { success: false, error: 'AWS SES not implemented' }
    } else {
      return { success: false, error: `Unknown email provider: ${EMAIL_PROVIDER}` }
    }
  } catch (error: any) {
    console.error('Email sending error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

/**
 * Email Templates
 */

/**
 * Order Confirmation Email
 */
export function getOrderConfirmationEmail(orderNumber: string, items: Array<{ name: string; quantity: number; unit: string; total: number }>, total: number, deliveryAddress: string) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity} ${item.unit}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₦${item.total.toLocaleString()}</td>
    </tr>
  `).join('')

  return {
    subject: `Order Confirmation - #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Confirmed!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Thank you for your order! We've received your order and will process it shortly.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #059669;">Order #${orderNumber}</h2>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                  <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                  <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">₦${total.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">Delivery Address</h3>
            <p style="margin: 0;">${deliveryAddress}</p>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Next Step:</strong> Please complete payment to confirm your order. You can track your order status in your account.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Orders</a>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
            If you have any questions, please contact our support team.
          </p>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Payment Confirmation Email
 */
export function getPaymentConfirmationEmail(orderNumber: string, amount: number, paymentRef: string) {
  return {
    subject: `Payment Confirmed - Order #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Payment Confirmed!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Great news! Your payment has been confirmed and your order is now being processed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #059669;">Payment Details</h2>
            <p><strong>Order Number:</strong> #${orderNumber}</p>
            <p><strong>Amount Paid:</strong> ₦${amount.toLocaleString()}</p>
            <p><strong>Payment Reference:</strong> ${paymentRef}</p>
          </div>

          <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <p style="margin: 0;"><strong>What's Next?</strong> The seller will prepare your order and it will be delivered to you soon. You'll receive updates as your order progresses.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Track Order</a>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Order Status Update Email
 */
export function getOrderStatusUpdateEmail(orderNumber: string, status: string, orderId: string) {
  const statusMessages: Record<string, string> = {
    PAID: 'Your order is confirmed and being prepared by the seller.',
    PREPARING: 'The seller is preparing your order.',
    OUT_FOR_DELIVERY: 'Your order is on the way! It should arrive soon.',
    DELIVERED: 'Your order has been delivered. We hope you enjoy your purchase!',
    CANCELLED: 'Your order has been cancelled.',
  }

  const statusMessage = statusMessages[status] || 'Your order status has been updated.'

  return {
    subject: `Order Update - #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Order Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Your order status has been updated.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #2563eb;">Order #${orderNumber}</h2>
            <p><strong>Status:</strong> ${status.replace('_', ' ')}</p>
            <p>${statusMessage}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/orders/${orderId}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Payment Received Email (for sellers)
 */
export function getPaymentReceivedEmail(orderNumber: string, amount: number) {
  return {
    subject: `Payment Received - Order #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Payment Received!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>Great news! You've received a payment for an order.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #059669;">Order #${orderNumber}</h2>
            <p><strong>Amount:</strong> ₦${amount.toLocaleString()}</p>
            <p style="color: #6b7280; font-size: 14px;">Payment is held in escrow and will be released after delivery confirmation.</p>
          </div>

          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please prepare and ship the order as soon as possible.</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/seller/orders" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Order</a>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}

/**
 * Delivery Assigned Email (for riders)
 */
export function getDeliveryAssignedEmail(orderNumber: string, deliveryAddress: string, orderId: string) {
  return {
    subject: `New Delivery Assignment - Order #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">New Delivery Assignment</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p>You have been assigned a new delivery.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #d97706;">Order #${orderNumber}</h2>
            <p><strong>Delivery Address:</strong></p>
            <p style="background: #f3f4f6; padding: 12px; border-radius: 6px;">${deliveryAddress}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/rider/deliveries/${orderId}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Delivery</a>
          </div>
        </div>
      </body>
      </html>
    `,
  }
}
