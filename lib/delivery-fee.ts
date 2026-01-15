/**
 * Delivery Fee Calculation Utilities
 * 
 * Calculates delivery fees based on distance between shop and delivery address
 */

import { calculateDistance } from './distance'

/**
 * Delivery fee calculation constants
 */
export const DELIVERY_FEE_CONFIG = {
  BASE_FEE: 500, // Base fee in NGN
  PER_KM_RATE: 100, // Additional fee per kilometer in NGN
  MAX_FEE: 5000, // Maximum delivery fee cap in NGN
  MIN_FEE: 500, // Minimum delivery fee in NGN
} as const

/**
 * Calculate delivery fee based on distance
 * @param distanceKm Distance in kilometers
 * @returns Delivery fee in NGN
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 0) {
    return DELIVERY_FEE_CONFIG.MIN_FEE
  }

  const fee = Math.round(
    DELIVERY_FEE_CONFIG.BASE_FEE + (distanceKm * DELIVERY_FEE_CONFIG.PER_KM_RATE)
  )

  // Apply min/max caps
  return Math.max(
    DELIVERY_FEE_CONFIG.MIN_FEE,
    Math.min(fee, DELIVERY_FEE_CONFIG.MAX_FEE)
  )
}

/**
 * Calculate delivery fee from coordinates
 * @param shopLat Shop latitude
 * @param shopLng Shop longitude
 * @param deliveryLat Delivery address latitude
 * @param deliveryLng Delivery address longitude
 * @returns Delivery fee in NGN, or null if coordinates are invalid
 */
export function calculateDeliveryFeeFromCoordinates(
  shopLat: number | null | undefined,
  shopLng: number | null | undefined,
  deliveryLat: number | null | undefined,
  deliveryLng: number | null | undefined
): number | null {
  // If any coordinate is missing, return null
  if (
    shopLat === null || shopLat === undefined ||
    shopLng === null || shopLng === undefined ||
    deliveryLat === null || deliveryLat === undefined ||
    deliveryLng === null || deliveryLng === undefined
  ) {
    return null
  }

  // Validate coordinates are within valid ranges
  if (
    shopLat < -90 || shopLat > 90 ||
    shopLng < -180 || shopLng > 180 ||
    deliveryLat < -90 || deliveryLat > 90 ||
    deliveryLng < -180 || deliveryLng > 180
  ) {
    return null
  }

  const distance = calculateDistance(shopLat, shopLng, deliveryLat, deliveryLng)
  return calculateDeliveryFee(distance)
}
