/**
 * Calculates the current business date based on a 6:00 AM reset point.
 * Operating timezone defaults to 'Asia/Colombo' (Sri Lanka).
 * 
 * If current local time >= 6:00 AM: business_date is today's calendar date.
 * If current local time < 6:00 AM: business_date is yesterday's calendar date.
 */
export function getBusinessDate(date: Date = new Date(), timezone = 'Asia/Colombo'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    })
    
    const parts = formatter.formatToParts(date)
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]))
    
    const year = parseInt(partMap.year)
    const month = parseInt(partMap.month) - 1
    const day = parseInt(partMap.day)
    const hour = parseInt(partMap.hour)
    
    const localDate = new Date(year, month, day)
    
    // If hour is before 6:00 AM, subtract 1 day to associate it with yesterday's business day
    if (hour < 6) {
      localDate.setDate(localDate.getDate() - 1)
    }
    
    const yyyy = localDate.getFullYear()
    const mm = String(localDate.getMonth() + 1).padStart(2, '0')
    const dd = String(localDate.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  } catch (err) {
    console.error('Error calculating business date in timezone:', timezone, err)
    // Fallback to local timezone dates
    const hour = date.getHours()
    const localDate = new Date(date)
    if (hour < 6) {
      localDate.setDate(localDate.getDate() - 1)
    }
    const yyyy = localDate.getFullYear()
    const mm = String(localDate.getMonth() + 1).padStart(2, '0')
    const dd = String(localDate.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
}

/**
 * Formats a KOT number as a 3-digit padded string (e.g. KOT-001)
 */
export function formatKotNumber(num: number | undefined | null): string {
  if (num === undefined || num === null) return 'KOT-???'
  return `KOT-${String(num).padStart(3, '0')}`
}
