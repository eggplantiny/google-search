import { URL } from 'node:url'
import * as cheerio from 'cheerio'

export function filterResult(linkUrl: string | undefined | null, includeGoogleLinks: boolean): string | null {
  if (!linkUrl) {
    return null
  }

  try {
    let actualLink = linkUrl

    // Decode Google's redirect URLs (/url?q=...)
    if (actualLink.startsWith('/url?')) {
      const parsedUrl = new URL(actualLink, 'https://www.google.com') // Base URL is needed for relative paths
      const q = parsedUrl.searchParams.get('q')
      if (q) {
        actualLink = q
      }
      else {
        return null // Invalid redirect URL
      }
    }

    // Ensure it's an absolute URL
    const parsed = new URL(actualLink) // Throws if invalid

    // Filter out relative URLs that might have slipped through (shouldn't if URL constructor works)
    if (!parsed.hostname) {
      return null
    }

    // Exclude Google links if requested
    if (!includeGoogleLinks && parsed.hostname.includes('google')) {
      return null
    }

    // Exclude webcache links, translate links, etc. (optional enhancement)
    if (parsed.pathname.startsWith('/search')
      || parsed.hostname.startsWith('webcache.googleusercontent')
      || parsed.hostname.startsWith('translate.google')) {
      return null
    }

    return actualLink
  }
  catch {
    // Ignore errors during parsing/filtering individual links (e.g., invalid URL format)
    // console.warn(`Failed to filter link: ${linkUrl}`, error);
    return null
  }
}

export function parseHtml(html: string, includeGoogleLinks: boolean): string[] {
  const $ = cheerio.load(html)
  const links: string[] = []

  // Try finding the main search results container first
  let anchors = $('#search').find('a')

  // Fallback if #search is not found (Google might change layout)
  if (anchors.length === 0) {
    // More robust fallback: look for common result link patterns
    // This might need adjustments based on Google's current HTML structure
    anchors = $('a[href^="/url?q="]') // Common pattern for organic results
    if (anchors.length === 0) {
      // Broadest fallback (might include unwanted links)
      console.warn('Could not find #search or /url?q= links, falling back to parsing all anchors. Results might be inaccurate.')
      // Exclude known navigation/tool links if possible
      $('#gbar, #tophf, .navigation, #footer').remove() // Remove common header/footer/nav sections
      anchors = $('a')
    }
  }

  anchors.each((_, element) => {
    const href = $(element).attr('href')
    const filteredLink = filterResult(href, includeGoogleLinks)
    if (filteredLink) {
      links.push(filteredLink)
    }
  })

  return links
}
