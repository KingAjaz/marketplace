/**
 * Inventory Management Utilities
 * 
 * Handles stock tracking, low stock alerts, and stock history
 */
import { prisma } from './prisma'
import { StockChangeType, NotificationType } from '@prisma/client'
import { createNotification } from './notifications'

/**
 * Update stock and create history record
 */
export async function updateStock(
  pricingUnitId: string,
  quantity: number, // Positive for increase, negative for decrease
  changeType: StockChangeType,
  orderId?: string,
  notes?: string
) {
  // Get current stock
  const pricingUnit = await prisma.pricingUnit.findUnique({
    where: { id: pricingUnitId },
    select: { stock: true, productId: true },
  })

  if (!pricingUnit) {
    throw new Error('Pricing unit not found')
  }

  const previousStock = pricingUnit.stock ?? 0
  const newStock = previousStock + quantity

  // Update stock (only if stock is tracked)
  if (pricingUnit.stock !== null) {
    await prisma.pricingUnit.update({
      where: { id: pricingUnitId },
      data: {
        stock: Math.max(0, newStock), // Ensure stock doesn't go negative
      },
    })
  }

  // Create stock history record
  await prisma.stockHistory.create({
    data: {
      pricingUnitId,
      changeType,
      quantity,
      previousStock,
      newStock: pricingUnit.stock !== null ? Math.max(0, newStock) : newStock,
      orderId,
      notes,
    },
  })

  // Check for low stock alert
  if (pricingUnit.stock !== null) {
    await checkLowStock(pricingUnitId, Math.max(0, newStock))
  }

  return { previousStock, newStock: Math.max(0, newStock) }
}

/**
 * Check if stock is low and send alert
 */
async function checkLowStock(pricingUnitId: string, currentStock: number) {
  const pricingUnit = await prisma.pricingUnit.findUnique({
    where: { id: pricingUnitId },
    include: {
      product: {
        include: {
          shop: {
            select: {
              userId: true,
            },
          },
        },
      },
    },
  })

  if (!pricingUnit || !pricingUnit.lowStockThreshold) {
    return
  }

  // Check if stock is at or below threshold
  if (currentStock <= pricingUnit.lowStockThreshold) {
    // Check if we've already sent a notification recently (within last hour)
    const recentNotification = await prisma.notification.findFirst({
      where: {
        userId: pricingUnit.product.shop.userId,
        type: NotificationType.LOW_STOCK_ALERT,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
      },
    })

    // Only send if we haven't sent one recently
    if (!recentNotification) {
      await createNotification(
        pricingUnit.product.shop.userId,
        NotificationType.LOW_STOCK_ALERT,
        'Low Stock Alert',
        `${pricingUnit.product.name} (${pricingUnit.unit}) is running low. Current stock: ${currentStock}, Threshold: ${pricingUnit.lowStockThreshold}`,
        `/seller/products/${pricingUnit.productId}`
      )
    }
  }
}

/**
 * Get low stock items for a seller
 */
export async function getLowStockItems(userId: string) {
  const shop = await prisma.shop.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!shop) {
    return []
  }

  const products = await prisma.product.findMany({
    where: { shopId: shop.id },
    include: {
      pricingUnits: {
        where: {
          stock: { not: null },
          lowStockThreshold: { not: null },
          isActive: true,
        },
      },
    },
  })

  const lowStockItems: Array<{
    productId: string
    productName: string
    pricingUnitId: string
    unit: string
    currentStock: number
    threshold: number
  }> = []

  for (const product of products) {
    for (const pricingUnit of product.pricingUnits) {
      if (
        pricingUnit.stock !== null &&
        pricingUnit.lowStockThreshold !== null &&
        pricingUnit.stock <= pricingUnit.lowStockThreshold
      ) {
        lowStockItems.push({
          productId: product.id,
          productName: product.name,
          pricingUnitId: pricingUnit.id,
          unit: pricingUnit.unit,
          currentStock: pricingUnit.stock,
          threshold: pricingUnit.lowStockThreshold,
        })
      }
    }
  }

  return lowStockItems
}

/**
 * Get stock history for a pricing unit
 */
export async function getStockHistory(pricingUnitId: string, limit: number = 50) {
  return prisma.stockHistory.findMany({
    where: { pricingUnitId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Restore stock when order is cancelled
 */
export async function restoreStockFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          pricingUnit: {
            select: { id: true, stock: true },
          },
        },
      },
    },
  })

  if (!order) {
    throw new Error('Order not found')
  }

  // Restore stock for each item
  for (const item of order.items) {
    if (item.pricingUnit.stock !== null) {
      await updateStock(
        item.pricingUnit.id,
        item.quantity, // Restore the quantity
        StockChangeType.ORDER_CANCELLED,
        orderId,
        `Stock restored due to order cancellation: ${order.orderNumber}`
      )
    }
  }
}
