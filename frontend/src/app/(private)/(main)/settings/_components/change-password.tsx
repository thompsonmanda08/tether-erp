'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { changePassword } from '@/app/_actions/settings'
import { AlertCircle, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react'

export function ChangePasswordModal() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false })
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const toggleVisibility = (field: 'current' | 'new' | 'confirm') =>
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }))

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setError(null)
      setSuccess(null)
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswords({ current: false, new: false, confirm: false })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      )

      if (result.success) {
        setSuccess('Password changed successfully')
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setTimeout(() => setOpen(false), 1500)
      } else {
        setError(result.message || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred while changing password')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Lock className="h-4 w-4" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Use a strong password with a mix of letters, numbers, and special characters.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{success}</p>
            </div>
          )}

          <div className="relative">
            <Input
              label="Current Password"
              id="currentPassword"
              type={showPasswords.current ? 'text' : 'password'}
              placeholder="Enter your current password"
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              disabled={isLoading}
            />
            <button type="button" onClick={() => toggleVisibility('current')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="New Password"
              id="newPassword"
              type={showPasswords.new ? 'text' : 'password'}
              placeholder="Enter your new password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              disabled={isLoading}
            />
            <button type="button" onClick={() => toggleVisibility('new')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">Must be at least 8 characters long</p>

          <div className="relative">
            <Input
              label="Confirm New Password"
              id="confirmPassword"
              type={showPasswords.confirm ? 'text' : 'password'}
              placeholder="Confirm your new password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              disabled={isLoading}
            />
            <button type="button" onClick={() => toggleVisibility('confirm')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} isLoading={isLoading} loadingText="Updating...">
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
