import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate unique order number
 * Format: ORD-YYYYMMDD-XXXXXX
 */
export function generateOrderNumber(): string {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `ORD-${dateStr}-${random}`
}

/**
 * Format Nigerian Naira currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calculate platform commission (5% default)
 */
export function calculatePlatformFee(subtotal: number, commissionRate: number = 0.05): number {
  return Math.round(subtotal * commissionRate * 100) / 100
}

/**
 * Generate OTP code (6 digits)
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Validate Nigerian phone number
 */
export function validateNigerianPhone(phone: string): boolean {
  // Nigerian phone numbers: +234XXXXXXXXXX or 0XXXXXXXXXX
  const cleaned = phone.replace(/\s+/g, '')
  const pattern = /^(\+234|0)[789][01]\d{8}$/
  return pattern.test(cleaned)
}

/**
 * Normalize Nigerian phone number to +234 format
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '')
  if (cleaned.startsWith('+234')) {
    return cleaned
  }
  if (cleaned.startsWith('0')) {
    return '+234' + cleaned.substring(1)
  }
  if (cleaned.startsWith('234')) {
    return '+' + cleaned
  }
  return '+234' + cleaned
}
