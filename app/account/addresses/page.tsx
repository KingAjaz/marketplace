'use client'

/**
 * Address Management Page
 * 
 * Users can:
 * - View all saved addresses
 * - Add new addresses
 * - Edit existing addresses
 * - Delete addresses
 * - Set default address
 */
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MapPin, Plus, Edit2, Trash2, Check, X } from 'lucide-react'
import Link from 'next/link'
import { AddressAutocomplete } from '@/components/address-autocomplete'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Address {
  id: string
  label: string | null
  street: string
  city: string
  state: string
  postalCode: string | null
  country: string
  addressText: string | null
  latitude: number | null
  longitude: number | null
  phone: string | null
  notes: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export default function AddressesPage() {
  const { user, status } = useAuth()
  const router = useRouter()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    label: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    phone: '',
    notes: '',
    isDefault: false,
    addressText: '',
    latitude: null as number | null,
    longitude: null as number | null,
  })
  const [error, setError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (status === 'unauthenticated' || !user) {
      router.push('/auth/signin')
      return
    }
    fetchAddresses()
  }, [session, router])

  const fetchAddresses = async () => {
    try {
      const response = await fetch('/api/addresses')
      if (response.ok) {
        const data = await response.json()
        setAddresses(data.addresses || [])
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (address: Address) => {
    setEditingId(address.id)
    setFormData({
      label: address.label || '',
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode || '',
      phone: address.phone || '',
      notes: address.notes || '',
      isDefault: address.isDefault,
      addressText: address.addressText || '',
      latitude: address.latitude,
      longitude: address.longitude,
    })
    setShowAddForm(false)
    setError('')
  }

  const handleCancel = () => {
    setEditingId(null)
    setShowAddForm(false)
    setFormData({
      label: '',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      phone: '',
      notes: '',
      isDefault: false,
      addressText: '',
      latitude: null,
      longitude: null,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.street || !formData.city || !formData.state) {
      setError('Street, city, and state are required')
      return
    }

    try {
      const url = editingId ? `/api/addresses/${editingId}` : '/api/addresses'
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: formData.label?.trim() || null,
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          postalCode: formData.postalCode?.trim() || null,
          country: 'Nigeria',
          addressText: formData.addressText?.trim() || null,
          latitude: formData.latitude,
          longitude: formData.longitude,
          isDefault: formData.isDefault,
          phone: formData.phone?.trim() || null,
          notes: formData.notes?.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Failed to save address'
        console.error('Address save error:', data)
        throw new Error(errorMsg)
      }

      await fetchAddresses()
      handleCancel()
    } catch (err: any) {
      console.error('Address save error:', err)
      setError(err.message || 'Failed to save address')
    }
  }

  const handleDelete = async (id: string) => {
    setAddressToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!addressToDelete) return

    try {
      const response = await fetch(`/api/addresses/${addressToDelete}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete address')
      }

      await fetchAddresses()
      toast({
        title: 'Success',
        description: 'Address deleted successfully',
        variant: 'success',
      })
      setDeleteDialogOpen(false)
      setAddressToDelete(null)
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Failed to delete address',
        variant: 'destructive',
      })
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/addresses/${id}/default`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to set default address')
      }

      await fetchAddresses()
      toast({
        title: 'Success',
        description: 'Default address updated successfully',
        variant: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Failed to set default address',
        variant: 'destructive',
      })
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Addresses</h1>
          <p className="text-gray-600">Manage your delivery addresses for faster checkout</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Address' : 'Add New Address'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="label">Address Label (Optional)</Label>
                  <Input
                    id="label"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    placeholder="Home, Work, Office, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <AddressAutocomplete
                    value={formData.addressText || formData.street}
                    onChange={(value) =>
                      setFormData({ ...formData, addressText: value, street: value })
                    }
                    onSelect={(details) => {
                      setFormData({
                        ...formData,
                        addressText: details.formattedAddress || details.street,
                        street: details.street || details.formattedAddress,
                        city: details.city,
                        state: details.state,
                        postalCode: details.postalCode || formData.postalCode,
                        latitude: details.latitude,
                        longitude: details.longitude,
                      })
                    }}
                    placeholder="Start typing an address..."
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Start typing to see address suggestions with autocomplete
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        required
                        placeholder="Lagos"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        required
                        placeholder="Lagos"
                        className="mt-2"
                      />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postalCode">Postal Code (Optional)</Label>
                    <Input
                      id="postalCode"
                      value={formData.postalCode}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="100001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Contact Phone (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="08012345678"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Delivery Instructions (Optional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g., Call before delivery, Gate code: 1234"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="isDefault" className="cursor-pointer">
                    Set as default address
                  </Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">{editingId ? 'Update' : 'Add'} Address</Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Addresses List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading addresses...</p>
          </div>
        ) : addresses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">No addresses saved</h2>
              <p className="text-gray-600 mb-4">Add your first address to get started</p>
              <Button onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {!showAddForm && !editingId && (
              <div className="mb-6">
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Address
                </Button>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {addresses.map((address) => (
                <Card key={address.id} className={address.isDefault ? 'border-primary border-2' : ''}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          {address.label || 'Address'}
                          {address.isDefault && (
                            <span className="text-xs bg-primary text-white px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">{address.street}</p>
                      <p className="text-gray-600">
                        {address.city}, {address.state}
                      </p>
                      {address.postalCode && (
                        <p className="text-gray-500">Postal Code: {address.postalCode}</p>
                      )}
                      {address.phone && (
                        <p className="text-gray-500">Phone: {address.phone}</p>
                      )}
                      {address.notes && (
                        <p className="text-gray-500 italic">Notes: {address.notes}</p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {!address.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(address.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(address)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(address.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setAddressToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
