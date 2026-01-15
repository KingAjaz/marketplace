/**
 * Shop Hours Utilities
 * 
 * Functions to check if shop is currently open based on operating hours
 */

interface OperatingHours {
  [key: string]: {
    open: string // HH:mm format
    close: string // HH:mm format
    closed: boolean
  }
}

/**
 * Check if shop is currently open
 * @param operatingHours JSON string of operating hours
 * @returns true if shop is open, false otherwise
 */
export function isShopOpen(operatingHours: string | null): boolean {
  if (!operatingHours) {
    return true // If no hours set, assume always open
  }

  try {
    const hours: OperatingHours = JSON.parse(operatingHours)
    const now = new Date()
    const dayName = now.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
    const dayHours = hours[dayName]

    if (!dayHours || dayHours.closed) {
      return false
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    return currentTime >= dayHours.open && currentTime <= dayHours.close
  } catch (error) {
    console.error('Failed to parse operating hours:', error)
    return true // Default to open if parsing fails
  }
}

/**
 * Get shop status message (Open/Closed)
 * @param operatingHours JSON string of operating hours
 * @returns Status message with next opening time if closed
 */
export function getShopStatus(operatingHours: string | null): {
  isOpen: boolean
  message: string
  nextOpenTime?: string
} {
  if (!operatingHours) {
    return { isOpen: true, message: 'Open' }
  }

  try {
    const hours: OperatingHours = JSON.parse(operatingHours)
    const now = new Date()
    const dayName = now.toLocaleLowerCase('en-US', { weekday: 'long' }).toLowerCase()
    const dayHours = hours[dayName]

    if (!dayHours || dayHours.closed) {
      // Find next open day
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      const currentDayIndex = days.indexOf(dayName)
      
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (currentDayIndex + i) % 7
        const nextDay = days[nextDayIndex]
        const nextDayHours = hours[nextDay]
        
        if (nextDayHours && !nextDayHours.closed) {
          const dayLabel = nextDay.charAt(0).toUpperCase() + nextDay.slice(1)
          return {
            isOpen: false,
            message: `Closed • Opens ${dayLabel} at ${nextDayHours.open}`,
            nextOpenTime: `${dayLabel} ${nextDayHours.open}`,
          }
        }
      }
      
      return { isOpen: false, message: 'Closed' }
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const isOpen = currentTime >= dayHours.open && currentTime <= dayHours.close

    if (isOpen) {
      return { isOpen: true, message: `Open • Closes at ${dayHours.close}` }
    } else {
      if (currentTime < dayHours.open) {
        return { isOpen: false, message: `Closed • Opens at ${dayHours.open}` }
      } else {
        // Find next open day
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        const currentDayIndex = days.indexOf(dayName)
        
        for (let i = 1; i <= 7; i++) {
          const nextDayIndex = (currentDayIndex + i) % 7
          const nextDay = days[nextDayIndex]
          const nextDayHours = hours[nextDay]
          
          if (nextDayHours && !nextDayHours.closed) {
            const dayLabel = nextDay.charAt(0).toUpperCase() + nextDay.slice(1)
            return {
              isOpen: false,
              message: `Closed • Opens ${dayLabel} at ${nextDayHours.open}`,
              nextOpenTime: `${dayLabel} ${nextDayHours.open}`,
            }
          }
        }
        
        return { isOpen: false, message: 'Closed' }
      }
    }
  } catch (error) {
    console.error('Failed to parse operating hours:', error)
    return { isOpen: true, message: 'Open' }
  }
}

/**
 * Format operating hours for display
 * @param operatingHours JSON string of operating hours
 * @returns Formatted string representation
 */
export function formatOperatingHours(operatingHours: string | null): string {
  if (!operatingHours) {
    return 'Open 24/7'
  }

  try {
    const hours: OperatingHours = JSON.parse(operatingHours)
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    const formatted = days.map((day, index) => {
      const dayHours = hours[day]
      if (!dayHours || dayHours.closed) {
        return `${dayLabels[index]}: Closed`
      }
      return `${dayLabels[index]}: ${dayHours.open} - ${dayHours.close}`
    })

    return formatted.join('\n')
  } catch (error) {
    console.error('Failed to format operating hours:', error)
    return 'Hours not available'
  }
}
