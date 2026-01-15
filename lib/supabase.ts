/**
 * Supabase Client
 * Used for phone OTP authentication
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Phone OTP will not work.')
}

// Create Supabase client for server-side use
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

/**
 * Send OTP to phone number using Supabase Auth
 */
export async function sendPhoneOTP(phoneNumber: string) {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
      options: {
        channel: 'sms',
      },
    })

    if (error) {
      console.error('Supabase OTP error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send OTP',
      }
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      data,
    }
  } catch (error: any) {
    console.error('Supabase OTP sending error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    }
  }
}

/**
 * Verify OTP code
 */
export async function verifyPhoneOTP(phoneNumber: string, token: string) {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phoneNumber,
      token,
      type: 'sms',
    })

    if (error) {
      console.error('Supabase OTP verification error:', error)
      return {
        success: false,
        error: error.message || 'Invalid OTP',
      }
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      data,
    }
  } catch (error: any) {
    console.error('Supabase OTP verification error:', error)
    return {
      success: false,
      error: error.message || 'Failed to verify OTP',
    }
  }
}
