'use client'

/**
 * Admin Session Refresh Page
 * 
 * This page helps refresh user data after adding an admin role.
 * It forces a refresh of user data to get updated roles.
 */
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'

export default function AdminRefreshPage() {
  const { user, status, refetch } = useAuth()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleRefresh = async () => {
    setRefreshing(true)
    setMessage('')
    
    try {
      // Force user data refresh
      await refetch()
      setMessage('User data refreshed! Check your roles below.')
      
      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/admin/dashboard')
      }, 2000)
    } catch (error) {
      setMessage('Failed to refresh user data. Please sign out and sign back in.')
    } finally {
      setRefreshing(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  const hasAdminRole = user?.roles?.includes('ADMIN')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Session Refresh</CardTitle>
          <CardDescription className="text-center">
            Refresh your session to update your roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Session Info */}
          <div className="space-y-3">
            <div>
              <span className="font-medium">Email:</span> {user?.email}
            </div>
            <div>
              <span className="font-medium">Current Roles:</span>
              <div className="mt-2 space-y-1">
                {user?.roles && user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <div key={role} className="flex items-center gap-2">
                      {role === 'ADMIN' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={role === 'ADMIN' ? 'font-semibold text-green-700' : ''}>
                        {role}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-gray-500">No roles assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Role Status */}
          {hasAdminRole ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Admin role detected!</span>
              </div>
              <p className="text-sm text-green-700 mt-2">
                You can now access the admin dashboard.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Admin role not found</span>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Make sure you've added an ADMIN role in Prisma Studio with:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                <li>role: ADMIN</li>
                <li>isActive: true</li>
                <li>userId: your user ID</li>
              </ul>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-3 rounded ${
              message.includes('refreshed') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Session'}
            </Button>
            
            {hasAdminRole && (
              <Button
                onClick={() => router.push('/admin/dashboard')}
                variant="outline"
                className="w-full"
              >
                Go to Admin Dashboard
              </Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center pt-4 border-t">
            <p>If refresh doesn't work, sign out completely and sign back in.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
