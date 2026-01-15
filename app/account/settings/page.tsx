'use client'

/**
 * Account Settings Page
 * 
 * Allows users to manage their profile, change password, email, and delete account
 */
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Loader2, User, Lock, Mail, Trash2, Camera, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface UserProfile {
  id: string
  email: string
  name: string | null
  phoneNumber: string | null
  emailVerified: Date | null
  phoneVerified: boolean
  image: string | null
  createdAt: Date
}

export default function AccountSettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Profile edit state
  const [profileData, setProfileData] = useState({
    name: '',
    phoneNumber: '',
  })
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  })

  // Email change state
  const [emailData, setEmailData] = useState({
    newEmail: '',
    password: '',
  })
  const [showEmailPassword, setShowEmailPassword] = useState(false)

  // Delete account state
  const [deleteData, setDeleteData] = useState({
    password: '',
    confirmDelete: '',
  })
  const [showDeletePassword, setShowDeletePassword] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/account/settings')
    } else if (status === 'authenticated') {
      fetchProfile()
    }
  }, [status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/account/profile')
      const data = await response.json()

      if (response.ok && data.user) {
        setProfile(data.user)
        setProfileData({
          name: data.user.name || '',
          phoneNumber: data.user.phoneNumber || '',
        })
        setProfileImage(data.user.image)
      } else {
        throw new Error(data.error || 'Failed to fetch profile')
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to load profile',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Image must be less than 5MB',
        variant: 'destructive',
      })
      return
    }

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok && data.url) {
        setProfileImage(data.url)
        // Auto-save image update
        await updateProfile({ image: data.url })
      } else {
        throw new Error(data.error || 'Failed to upload image')
      }
    } catch (error: any) {
      console.error('Failed to upload image:', error)
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload image',
        variant: 'destructive',
      })
    } finally {
      setUploadingImage(false)
      // Reset file input
      e.target.value = ''
    }
  }

  const updateProfile = async (updates: { name?: string; phoneNumber?: string; image?: string | null }) => {
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      const data = await response.json()

      if (response.ok) {
        // Update local state
        if (data.user) {
          setProfile(data.user)
        }
        
        // Refresh session to get updated data
        await update()
        
        toast({
          title: 'Success',
          description: 'Profile updated successfully',
          variant: 'default',
        })
        return true
      } else {
        throw new Error(data.error || 'Failed to update profile')
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error)
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      })
      return false
    }
  }

  const handleProfileSave = async () => {
    const updates: any = {}
    
    if (profileData.name !== profile?.name) {
      updates.name = profileData.name
    }
    
    if (profileData.phoneNumber && profileData.phoneNumber !== profile?.phoneNumber) {
      updates.phoneNumber = profileData.phoneNumber
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: 'No Changes',
        description: 'No changes to save',
        variant: 'default',
      })
      return
    }

    await updateProfile(updates)
  }

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all password fields',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive',
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'New password and confirmation do not match',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Password changed successfully',
          variant: 'default',
        })
        // Reset form
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })
      } else {
        throw new Error(data.error || 'Failed to change password')
      }
    } catch (error: any) {
      console.error('Failed to change password:', error)
      toast({
        title: 'Change Failed',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      })
    }
  }

  const handleEmailChange = async () => {
    if (!emailData.newEmail || !emailData.password) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in both email and password',
        variant: 'destructive',
      })
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailData.newEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      })
      return
    }

    if (emailData.newEmail.toLowerCase() === profile?.email.toLowerCase()) {
      toast({
        title: 'Same Email',
        description: 'New email must be different from current email',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/account/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: emailData.newEmail,
          password: emailData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your new email inbox to verify the change',
          variant: 'default',
        })
        // Reset form
        setEmailData({
          newEmail: '',
          password: '',
        })
      } else {
        throw new Error(data.error || 'Failed to initiate email change')
      }
    } catch (error: any) {
      console.error('Failed to change email:', error)
      toast({
        title: 'Change Failed',
        description: error.message || 'Failed to change email',
        variant: 'destructive',
      })
    }
  }

  const handleAccountDelete = async () => {
    if (deleteData.confirmDelete !== 'DELETE') {
      toast({
        title: 'Confirmation Required',
        description: 'Please type DELETE to confirm account deletion',
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deleteData.password || undefined,
          confirmDelete: deleteData.confirmDelete,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Account Deleted',
          description: 'Your account has been deleted successfully',
          variant: 'default',
        })
        // Sign out and redirect to home
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to delete account')
      }
    } catch (error: any) {
      console.error('Failed to delete account:', error)
      toast({
        title: 'Deletion Failed',
        description: error.message || 'Failed to delete account',
        variant: 'destructive',
      })
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Failed to load profile</p>
            <Button className="w-full mt-4" onClick={fetchProfile}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              ← Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Update your profile information and photo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Profile Picture */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {profileImage ? (
                      <div className="relative w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white shadow-lg">
                        {profileImage.startsWith('http') || profileImage.startsWith('//') ? (
                          <Image
                            src={profileImage}
                            alt="Profile"
                            width={120}
                            height={120}
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="w-[120px] h-[120px] rounded-full bg-gray-200 flex items-center justify-center border-4 border-white shadow-lg">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    <label
                      htmlFor="image-upload"
                      className={`absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  <div>
                    <p className="font-medium">Profile Picture</p>
                    <p className="text-sm text-gray-500">Click the camera icon to upload a new photo</p>
                    <p className="text-xs text-gray-400 mt-1">Max size: 5MB</p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="Enter your full name"
                    className="mt-2"
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-gray-50"
                    />
                    {profile.emailVerified ? (
                      <span title="Email verified">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </span>
                    ) : (
                      <span title="Email not verified">
                        <XCircle className="h-5 w-5 text-yellow-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed here. Use the Email tab to change your email.
                    {!profile.emailVerified && (
                      <Link href="/auth/verify-email" className="text-primary hover:underline ml-1">
                        Verify your email
                      </Link>
                    )}
                  </p>
                </div>

                {/* Phone Number */}
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      id="phone"
                      value={profileData.phoneNumber}
                      onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                      placeholder="+2348012345678 or 08012345678"
                      className="flex-1"
                    />
                    {profile.phoneVerified && (
                      <span title="Phone verified">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Nigerian phone numbers only</p>
                </div>

                {/* Account Created */}
                <div>
                  <Label>Member Since</Label>
                  <p className="text-sm text-gray-600 mt-2">
                    {new Date(profile.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <Button onClick={handleProfileSave} className="w-full">
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Password Tab */}
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </CardTitle>
                <CardDescription>Update your password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="current-password"
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="new-password"
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="confirm-password"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button onClick={handlePasswordChange} className="w-full">
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Tab */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Change Email Address
                </CardTitle>
                <CardDescription>
                  Update your email address. A verification email will be sent to your new address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Current Email</Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="bg-gray-50 mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="new-email">New Email Address</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailData.newEmail}
                    onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                    placeholder="Enter new email address"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email-password">Current Password</Label>
                  <div className="relative mt-2">
                    <Input
                      id="email-password"
                      type={showEmailPassword ? 'text' : 'password'}
                      value={emailData.password}
                      onChange={(e) => setEmailData({ ...emailData, password: e.target.value })}
                      placeholder="Enter your password to confirm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showEmailPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password required for security verification
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> After submitting, you'll receive a verification email at your new
                    address. Your email will not change until you verify it. You can still sign in with your
                    current email until the change is verified.
                  </p>
                </div>

                <Button onClick={handleEmailChange} className="w-full">
                  Send Verification Email
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Danger Zone Tab */}
          <TabsContent value="danger">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Trash2 className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>
                  Irreversible and destructive actions. Please proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-2">Delete Account</h3>
                  <p className="text-sm text-red-800 mb-4">
                    Once you delete your account, there is no going back. This will permanently delete your
                    account, orders, and all associated data. Make sure you've completed or cancelled all
                    pending orders before proceeding.
                  </p>

                  <div className="space-y-4">
                    {session?.user?.email?.includes('@') && (
                      <div>
                        <Label htmlFor="delete-password">Password</Label>
                        <div className="relative mt-2">
                          <Input
                            id="delete-password"
                            type={showDeletePassword ? 'text' : 'password'}
                            value={deleteData.password}
                            onChange={(e) =>
                              setDeleteData({ ...deleteData, password: e.target.value })
                            }
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showDeletePassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Required for email/password accounts
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="confirm-delete">
                        Type <strong>DELETE</strong> to confirm
                      </Label>
                      <Input
                        id="confirm-delete"
                        value={deleteData.confirmDelete}
                        onChange={(e) =>
                          setDeleteData({ ...deleteData, confirmDelete: e.target.value })
                        }
                        placeholder="Type DELETE"
                        className="mt-2"
                      />
                    </div>

                    <Button
                      onClick={handleAccountDelete}
                      variant="destructive"
                      className="w-full"
                      disabled={
                        deleteData.confirmDelete !== 'DELETE' ||
                        (session?.user?.email?.includes('@') && !deleteData.password)
                      }
                    >
                      Delete My Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
