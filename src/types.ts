import type { CookieJar } from 'tough-cookie'

export interface SearchOptions {
  tld?: string // Top level domain (default: 'com')
  lang?: string // Language (default: 'en')
  tbs?: string // Time limits (e.g., 'qdr:d') (default: '0')
  safe?: 'on' | 'off' // Safe search (default: 'off')
  num?: number // Results per page (default: 10)
  start?: number // Start index (default: 0)
  stop?: number | null // Stop index (null for continuous) (default: null)
  pause?: number // Pause between requests in ms (default: 2000)
  country?: string // Country code (default: '')
  extraParams?: Record<string, string> // Extra URL parameters
  userAgent?: string | null // User agent (null for random)
  includeGoogleLinks?: boolean // Include google.com links (default: false)
  cookieJar?: CookieJar // Optional external cookie jar
}

export interface SearchResultItem {
  link: string
  title: string
  content: string
}
