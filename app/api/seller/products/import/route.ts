/**
 * Import Products from CSV API
 * 
 * Imports products from CSV file
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'

interface CSVRow {
  name: string
  description?: string
  category: ProductCategory
  images?: string
  unit: string
  price: number
  stock?: number | null
  lowStockThreshold?: number | null
  isAvailable?: boolean
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter((line) => line.trim())
  if (lines.length < 2) return [] // Need at least header + one row

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  const rows: CSVRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''))
    if (values.length < headers.length) continue

    const row: any = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    // Parse the row
    if (row.Name && row.Unit && row.Price) {
      rows.push({
        name: row.Name,
        description: row.Description || '',
        category: (row.Category as ProductCategory) || 'FOODSTUFFS',
        images: row.Images ? row.Images.split(';').filter((img: string) => img.trim()) : [],
        unit: row.Unit,
        price: parseFloat(row.Price) || 0,
        stock: row.Stock ? parseInt(row.Stock) : null,
        lowStockThreshold: row.LowStockThreshold ? parseInt(row.LowStockThreshold) : null,
        isAvailable: row.IsAvailable === 'true' || row.IsAvailable === true,
      })
    }
  }

  return rows
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a seller
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId: session.user.id,
        role: 'SELLER',
        isActive: true,
        sellerStatus: 'APPROVED',
      },
    })

    if (!userRole) {
      return NextResponse.json(
        { error: 'You must be an approved seller to import products' },
        { status: 403 }
      )
    }

    // Get seller's shop
    const shop = await prisma.shop.findUnique({
      where: { userId: session.user.id },
    })

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'CSV file is required' },
        { status: 400 }
      )
    }

    // Read file content
    const csvText = await file.text()
    const rows = parseCSV(csvText)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'No valid products found in CSV file' },
        { status: 400 }
      )
    }

    // Group rows by product name (same product can have multiple pricing units)
    const productsMap = new Map<string, CSVRow[]>()
    for (const row of rows) {
      if (!productsMap.has(row.name)) {
        productsMap.set(row.name, [])
      }
      productsMap.get(row.name)!.push(row)
    }

    let createdCount = 0
    let updatedCount = 0
    const errors: string[] = []

    // Process each product
    for (const [productName, pricingRows] of productsMap.entries()) {
      try {
        const firstRow = pricingRows[0]

        // Check if product already exists
        const existingProduct = await prisma.product.findFirst({
          where: {
            shopId: shop.id,
            name: productName,
          },
          include: {
            pricingUnits: true,
          },
        })

        if (existingProduct) {
          // Update existing product
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              description: firstRow.description || existingProduct.description,
              category: firstRow.category,
              images: (firstRow.images && firstRow.images.length > 0 ? firstRow.images : existingProduct.images) as string[],
              isAvailable: firstRow.isAvailable !== undefined ? firstRow.isAvailable : existingProduct.isAvailable,
            },
          })

          // Add/update pricing units
          for (const row of pricingRows) {
            const existingUnit = existingProduct.pricingUnits.find((u) => u.unit === row.unit)
            if (existingUnit) {
              await prisma.pricingUnit.update({
                where: { id: existingUnit.id },
                data: {
                  price: row.price,
                  stock: row.stock,
                  lowStockThreshold: row.lowStockThreshold,
                  isActive: true,
                },
              })
            } else {
              await prisma.pricingUnit.create({
                data: {
                  productId: existingProduct.id,
                  unit: row.unit,
                  price: row.price,
                  stock: row.stock,
                  lowStockThreshold: row.lowStockThreshold,
                  isActive: true,
                },
              })
            }
          }
          updatedCount++
        } else {
          // Create new product
          const newProduct = await prisma.product.create({
            data: {
              shopId: shop.id,
              name: productName,
              description: firstRow.description || null,
              category: firstRow.category,
              images: firstRow.images && firstRow.images.length > 0 ? firstRow.images : [],
              isAvailable: firstRow.isAvailable !== undefined ? firstRow.isAvailable : true,
              pricingUnits: {
                create: pricingRows.map((row) => ({
                  unit: row.unit,
                  price: row.price,
                  stock: row.stock,
                  lowStockThreshold: row.lowStockThreshold,
                  isActive: true,
                })),
              },
            },
          })
          createdCount++
        }
      } catch (error: any) {
        errors.push(`Failed to process ${productName}: ${error.message}`)
      }
    }

    return NextResponse.json({
      message: 'Products imported successfully',
      created: createdCount,
      updated: updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Import products error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import products' },
      { status: 500 }
    )
  }
}
