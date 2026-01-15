/**
 * SMS Service Integration
 * Supports Termii (recommended for Nigeria) and Twilio
 */
const SMS_API_KEY = process.env.SMS_API_KEY || ''
const SMS_API_URL = process.env.SMS_API_URL || ''
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'termii' // 'termii' or 'twilio'
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || ''
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || ''

export interface SendSMSOptions {
  to: string
  message: string
}

export interface SMSResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Send SMS via Termii
 */
async function sendViaTermii(to: string, message: string): Promise<SMSResponse> {
  if (!SMS_API_KEY) {
    throw new Error('Termii API key not configured')
  }

  // Use default Termii API URL if not provided
  const apiUrl = SMS_API_URL || 'https://api.ng.termii.com/api/sms/send'

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: SMS_API_KEY,
        to: to,
        from: process.env.TERMII_SENDER_ID || 'N-Market', // Sender ID (must be approved by Termii)
        sms: message,
        type: 'plain',
        channel: 'generic',
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Failed to send SMS via Termii',
      }
    }

    return {
      success: true,
      message: 'SMS sent successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
}

/**
 * Send SMS via Twilio
 */
async function sendViaTwilio(to: string, message: string): Promise<SMSResponse> {
  // Extract Account SID from URL if not provided separately
  let accountSid = TWILIO_ACCOUNT_SID
  if (!accountSid && SMS_API_URL) {
    const match = SMS_API_URL.match(/Accounts\/([^\/]+)/)
    if (match) {
      accountSid = match[1]
    }
  }

  if (!accountSid || !SMS_API_KEY || !TWILIO_PHONE_NUMBER) {
    throw new Error('Twilio credentials not fully configured. Need: Account SID, Auth Token (SMS_API_KEY), and Phone Number')
  }

  try {
    // Use SMS_API_URL if provided and valid, otherwise construct it
    let url = SMS_API_URL
    if (!url || !url.includes('Accounts')) {
      url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    } else {
      // Ensure Account SID in URL matches
      url = url.replace(/Accounts\/[^\/]+/, `Accounts/${accountSid}`)
    }
    
    // Create Basic Auth header with Account SID and Auth Token
    const authString = Buffer.from(`${accountSid}:${SMS_API_KEY}`).toString('base64')
    
    console.log(`[Twilio] Sending SMS to ${to} from ${TWILIO_PHONE_NUMBER}`)
    console.log(`[Twilio] URL: ${url}`)
    console.log(`[Twilio] Account SID: ${accountSid}`)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authString}`,
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: to,
        Body: message,
      }),
    })

    const responseText = await response.text()
    console.log(`[Twilio] Response status: ${response.status}`)
    console.log(`[Twilio] Response: ${responseText}`)
    
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('[Twilio] Failed to parse response:', responseText)
      return {
        success: false,
        error: `Invalid response from Twilio: ${responseText}`,
      }
    }

    if (!response.ok) {
      const errorMsg = data.message || data.error || 'Failed to send SMS via Twilio'
      console.error(`[Twilio] Error: ${errorMsg}`, data)
      return {
        success: false,
        error: errorMsg,
      }
    }

    console.log(`[Twilio] SMS sent successfully. SID: ${data.sid}`)
    return {
      success: true,
      message: 'SMS sent successfully',
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
}

/**
 * Send SMS to phone number
 * Automatically selects provider based on SMS_PROVIDER env variable
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResponse> {
  const { to, message } = options

  // In development, check if SMS should be sent
  const isDevelopment = process.env.NODE_ENV === 'development'
  const enableSmsInDev = process.env.ENABLE_SMS_IN_DEV === 'true'
  
  if (isDevelopment && !enableSmsInDev) {
    console.log(`[SMS] Development mode - SMS not sent (set ENABLE_SMS_IN_DEV=true to enable)`)
    console.log(`[SMS] To: ${to}`)
    console.log(`[SMS] Message: ${message}`)
    return {
      success: true,
      message: 'SMS logged (development mode - set ENABLE_SMS_IN_DEV=true to send real SMS)',
    }
  }
  
  if (isDevelopment && enableSmsInDev) {
    console.log(`[SMS] Development mode with SMS enabled - sending real SMS`)
  }

  // Check if SMS is configured based on provider
  if (SMS_PROVIDER.toLowerCase() === 'twilio') {
    // Extract Account SID from URL if not provided separately
    let accountSid = TWILIO_ACCOUNT_SID
    if (!accountSid && SMS_API_URL) {
      const match = SMS_API_URL.match(/Accounts\/([^\/]+)/)
      if (match) {
        accountSid = match[1]
      }
    }

    if (!accountSid || !SMS_API_KEY || !TWILIO_PHONE_NUMBER) {
      console.warn('Twilio not fully configured. Missing: Account SID (from URL or TWILIO_ACCOUNT_SID), SMS_API_KEY (Auth Token), or TWILIO_PHONE_NUMBER')
      return {
        success: false,
        error: 'Twilio not fully configured. Check your .env file.',
      }
    }
  } else {
    // Termii
    if (!SMS_API_KEY) {
      console.warn('Termii API key not configured')
      return {
        success: false,
        error: 'Termii API key not configured',
      }
    }
  }

  try {
    if (SMS_PROVIDER.toLowerCase() === 'twilio') {
      return await sendViaTwilio(to, message)
    } else {
      // Default to Termii
      return await sendViaTermii(to, message)
    }
  } catch (error: any) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send SMS',
    }
  }
}
