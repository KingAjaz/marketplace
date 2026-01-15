/**
 * Password Strength Utilities
 * 
 * Functions to check password strength and provide feedback
 */

export interface PasswordStrength {
  score: number // 0-4 (0 = very weak, 4 = very strong)
  label: string // 'Very Weak', 'Weak', 'Fair', 'Good', 'Strong'
  feedback: string[] // Array of feedback messages
  color: string // Tailwind color class
}

/**
 * Check password strength
 * @param password Password to check
 * @returns Password strength information
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      feedback: [],
      color: 'bg-gray-200',
    }
  }

  const feedback: string[] = []
  let score = 0

  // Length check
  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('At least 8 characters')
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include lowercase letters')
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include uppercase letters')
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include numbers')
  }

  // Special character check
  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include special characters (!@#$%^&*)')
  }

  // Determine label and color
  let label: string
  let color: string

  if (score <= 1) {
    label = 'Very Weak'
    color = 'bg-red-500'
  } else if (score === 2) {
    label = 'Weak'
    color = 'bg-orange-500'
  } else if (score === 3) {
    label = 'Fair'
    color = 'bg-yellow-500'
  } else if (score === 4) {
    label = 'Good'
    color = 'bg-blue-500'
  } else {
    label = 'Strong'
    color = 'bg-green-500'
  }

  return {
    score: Math.min(score, 4), // Cap at 4 for display
    label,
    feedback,
    color,
  }
}

/**
 * Get password strength percentage (0-100)
 * @param password Password to check
 * @returns Percentage (0-100)
 */
export function getPasswordStrengthPercentage(password: string): number {
  const strength = checkPasswordStrength(password)
  return (strength.score / 4) * 100
}
