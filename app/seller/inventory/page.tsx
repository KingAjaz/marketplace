'use client'

/**
 * Seller Inventory Management Page
 * 
 * View low stock items, manage inventory, and view stock history
 */
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import { Package, AlertTriangle, TrendingDown, ArrowLeft, Loader2, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LowStockItem {
  productId: string
  productName: string
  pricingUnitId: string
  unit: string
  currentStock: number
  threshold: number
}

interface InventoryOverview {
  totalProducts: number
  totalStockItems: number
  totalStockValue: number
  outOfStockItems: number
  lowStockCount: number
}

export default function SellerInventoryPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [overview, setOverview] = useState<InventoryOverview | null>(null)
  const [selectedItem, setSelectedItem] = useState<LowStockItem | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [editForm, setEditForm] = useState({
    stock: '',
    lowStockThreshold: '',
  })

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/seller/inventory')
      if (response.ok) {
        const data = await response.json()
        setLowStockItems(data.lowStockItems || [])
        setOverview(data.overview || null)
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch inventory data',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch inventory data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditStock = (item: LowStockItem) => {
    setSelectedItem(item)
    setEditForm({
      stock: item.currentStock.toString(),
      lowStockThreshold: item.threshold?.toString() || '',
    })
    setShowEditDialog(true)
  }

  const handleUpdateStock = async () => {
    if (!selectedItem) return

    setUpdating(true)
    try {
      const response = await fetch('/api/seller/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricingUnitId: selectedItem.pricingUnitId,
          stock: editForm.stock ? parseInt(editForm.stock) : null,
          lowStockThreshold: editForm.lowStockThreshold ? parseInt(editForm.lowStockThreshold) : null,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Stock updated successfully',
          variant: 'default',
        })
        setShowEditDialog(false)
        setSelectedItem(null)
        fetchInventory()
      } else {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update stock')
      }
    } catch (error: any) {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update stock',
        variant: 'destructive',
      })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
          <p className="text-gray-600">Monitor stock levels and manage inventory</p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview.totalStockItems}</div>
                <p className="text-xs text-gray-500 mt-1">Items with stock tracking</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overview.totalStockValue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overview.lowStockCount}</div>
                <p className="text-xs text-gray-500 mt-1">Items need attention</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Low Stock Items */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-500" />
              Low Stock Items
            </CardTitle>
            <CardDescription>
              Items that are below their stock threshold or out of stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No low stock items</p>
                <p className="text-sm text-gray-500 mt-2">All items are well stocked</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockItems.map((item, index) => (
                  <div
                    key={`${item.productId}-${item.pricingUnitId}-${index}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium">{item.productName}</h3>
                        <p className="text-sm text-gray-600">Unit: {item.unit}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span
                            className={`text-sm font-medium ${
                              item.currentStock === 0
                                ? 'text-red-600'
                                : item.currentStock <= item.threshold
                                ? 'text-yellow-600'
                                : 'text-gray-600'
                            }`}
                          >
                            Stock: {item.currentStock}
                          </span>
                          <span className="text-xs text-gray-500">
                            Threshold: {item.threshold}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditStock(item)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Update Stock
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Stock Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Stock</DialogTitle>
              <DialogDescription>
                Update stock level and threshold for {selectedItem?.productName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="stock">Current Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={editForm.stock}
                  onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                  placeholder="Enter stock quantity"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty or set to null for unlimited stock
                </p>
              </div>
              <div>
                <Label htmlFor="threshold">Low Stock Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={editForm.lowStockThreshold}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lowStockThreshold: e.target.value })
                  }
                  placeholder="Alert when stock falls below this number"
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll receive alerts when stock falls below this number
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false)
                  setSelectedItem(null)
                }}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateStock} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Stock'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
