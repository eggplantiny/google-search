import type { CookieJar } from 'tough-cookie'
import * as iconv from 'iconv-lite' // For decoding non-UTF8 responses
import { Cookie } from 'tough-cookie'
// Node fetch is globally available in Node 18+
// import fetch, { Headers, RequestInit, Response } from 'node-fetch'; // Uncomment for Node < 18

// Timeout helper
class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export class HttpClient {
  public cookieJar: CookieJar
  // verifySsl option is removed as it's not easily controllable per-request with fetch
  // Control via NODE_TLS_REJECT_UNAUTHORIZED=0 environment variable if needed.

  constructor(cookieJar: CookieJar) {
    this.cookieJar = cookieJar
  }

  async getPage(
    url: string,
    userAgent: string,
    timeoutMs: number = 15000, // Default timeout 15 seconds
  ): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      console.warn(`Request timed out after ${timeoutMs}ms for URL: ${url}`)
      controller.abort()
    }, timeoutMs)

    try {
      // 1. Get cookies from jar for the request URL
      const cookieString = await this.cookieJar.getCookieString(url)

      const headers: HeadersInit = { // Use HeadersInit type
        'User-Agent': userAgent,
      }
      if (cookieString) {
        headers.Cookie = cookieString
      }

      const options: RequestInit = {
        method: 'GET',
        headers,
        signal: controller.signal,
        redirect: 'follow', // Handle redirects automatically
        // Note: No easy equivalent for rejectUnauthorized: false here
      }

      // 2. Perform the fetch request
      const response = await fetch(url, options)

      // Clear the timeout timer as the request completed (or failed)
      clearTimeout(timeoutId)

      // 3. Check if the response was successful
      if (!response.ok) {
        // Try reading the body even on error for more context
        let errorBody = ''
        try {
          errorBody = await response.text()
        }
        catch (e) {
          // Ignore if body can't be read
        }
        throw new Error(`HTTP Error: ${response.status} ${response.statusText} for ${url}\nBody: ${errorBody.substring(0, 500)}`)
      }

      // 4. Set cookies received from the response into the jar
      // response.headers.getSetCookie() is preferred as it correctly handles multiple Set-Cookie headers.
      // Requires Node v18.15.0+
      const setCookieHeaders = ('getSetCookie' in response.headers)

        ? response.headers.getSetCookie()
        : (response.headers as any).raw()['set-cookie'] // Fallback for older Node or type defs

      if (setCookieHeaders) {
        // console.log("Set-Cookie headers:", setCookieHeaders); // Debug
        await Promise.all(setCookieHeaders.map((cookieString) => {
          try {
            // console.log(`Setting cookie: ${cookieString} for url: ${url}`); // Debug
            return this.cookieJar.setCookie(cookieString, response.url || url) // Use response.url if redirected
          }
          catch (err) {
            console.warn(`Failed to set cookie: "${cookieString}"`, err)
            return Promise.resolve() // Don't fail the whole request for one bad cookie
          }
        }))
      }

      // 5. Get response body as ArrayBuffer
      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer) // Convert ArrayBuffer to Node.js Buffer

      // 6. Decode using detected or default charset (same logic as before)
      const contentType = response.headers.get('content-type') || ''
      let charset = 'utf-8' // Default
      const charsetMatch = contentType.match(/charset=([\w-]+)/i) // case-insensitive match

      if (charsetMatch) {
        charset = charsetMatch[1].toLowerCase()
      }
      else {
        // Simple check for common non-UTF8 Google results:
        const preliminaryHtml = buffer.toString('latin1')
        const metaCharsetMatch = preliminaryHtml.match(/<meta.*?charset=["']?([\w-]+)["']?/i)
        if (metaCharsetMatch) {
          charset = metaCharsetMatch[1].toLowerCase()
        }
      }

      // Decode using detected or default charset
      if (iconv.encodingExists(charset) && charset !== 'utf-8' && charset !== 'utf8') { // Avoid re-encoding utf8
        try {
          return iconv.decode(buffer, charset)
        }
        catch (decodeError) {
          console.warn(`Failed to decode with charset ${charset}, falling back to UTF-8. Error: ${decodeError}`)
          return buffer.toString('utf-8') // Fallback on decode error
        }
      }
      else {
        if (!iconv.encodingExists(charset) && charset !== 'utf-8' && charset !== 'utf8') {
          console.warn(`Unsupported or unrecognized charset: ${charset}. Falling back to UTF-8.`)
        }
        return buffer.toString('utf-8') // Use UTF-8 if detected or as fallback
      }
    }
    catch (error: any) {
      // Ensure timeout is cleared on any error
      clearTimeout(timeoutId)

      if (error.name === 'AbortError') {
        // Fetch request was aborted (likely due to timeout)
        throw new FetchTimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`)
      }
      // Re-throw other errors
      console.error(`Workspace error for ${url}:`, error)
      throw error
    }
  }
}
