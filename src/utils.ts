// Utility to pause execution
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper function to format the tbs parameter from Date objects
export function getTbs(fromDate: Date, toDate: Date): string {
  // Ensure MM/DD/YYYY format. Be mindful of timezones if precision matters.
  const pad = (num: number) => num.toString().padStart(2, '0')
  const fromStr = `${pad(fromDate.getMonth() + 1)}/${pad(fromDate.getDate())}/${fromDate.getFullYear()}`
  const toStr = `${pad(toDate.getMonth() + 1)}/${pad(toDate.getDate())}/${toDate.getFullYear()}`
  return `cdr:1,cd_min:${fromStr},cd_max:${toStr}`
}

// Helper to replace placeholders in URL templates
// Note: This is a basic version. More robust templating might be needed.
export function formatUrl(template: string, params: Record<string, string | number | undefined>): string {
  let url = template
  for (const key in params) {
    const value = params[key]
    if (value !== undefined) {
      // Basic replacement, adjust regex/logic as needed for different types (%s, %d)
      url = url.replace(`%(${key})s`, String(value))
        .replace(`%(${key})d`, String(value))
        .replace(`%(${key})`, String(value)) // Generic placeholder
    }
  }
  return url
}
