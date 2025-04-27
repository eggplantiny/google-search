import type { SearchOptions } from './types'
import { URLSearchParams } from 'node:url'
import { Cookie, CookieJar } from 'tough-cookie'
import { config } from './config'
import { HttpClient } from './httpClient'
import { parseHtml } from './parser'
import { getRandomUserAgent } from './userAgentProvider'
import { formatUrl, sleep } from './utils'

const defaultOptions: Required<Omit<SearchOptions, 'stop' | 'extraParams' | 'userAgent' | 'cookieJar'>> & Pick<SearchOptions, 'stop' | 'extraParams' | 'userAgent' | 'cookieJar'> = {
  tld: 'com',
  lang: 'en',
  tbs: '0',
  safe: 'off',
  num: 10,
  start: 0,
  stop: null,
  pause: 2000,
  country: '',
  extraParams: {},
  userAgent: null, // Indicates random should be used
  verifySsl: true,
  includeGoogleLinks: false,
  cookieJar: new CookieJar(), // Default in-memory jar per search instance
}

export async function* search(
  query: string,
  options?: SearchOptions,
): AsyncGenerator<string, void, undefined> {
  const settings: Required<Omit<SearchOptions, 'stop' | 'extraParams' | 'userAgent' | 'cookieJar'>> & Pick<SearchOptions, 'stop' | 'extraParams' | 'userAgent' | 'cookieJar'> = {
    ...defaultOptions,
    ...options,
    cookieJar: options?.cookieJar ?? new CookieJar(), // Use provided or create new
    extraParams: { ...(options?.extraParams || {}) }, // Deep copy extraParams
  }

  // Validate overlapping parameters
  for (const builtinParam of config.urlParameters) {
    if (settings.extraParams && builtinParam in settings.extraParams) {
      throw new Error(`GET parameter "${builtinParam}" is overlapping with built-in parameters.`)
    }
  }

  const httpClient = new HttpClient(settings.cookieJar, settings.verifySsl)
  const hashes = new Set<string>() // Use string hashes or the URLs themselves
  let count = 0
  let currentStart = settings.start

  // Initial fetch to potentially get cookies (optional, depends on Google's behavior)
  // try {
  //   const initialUserAgent = settings.userAgent ?? getRandomUserAgent();
  //   const homeUrl = formatUrl(config.urls.home, { tld: settings.tld });
  //   await httpClient.getPage(homeUrl, initialUserAgent);
  //   console.log("Initial homepage fetch successful (for cookies).");
  // } catch (error) {
  //   console.warn('Failed to fetch Google home page for initial cookies:', error);
  // }

  while (settings.stop === null || count < settings.stop) {
    const lastCount = count

    // Determine user agent for this request
    const userAgent = settings.userAgent ?? getRandomUserAgent()

    // Build URL
    let urlTemplate: string
    const urlParams: any = { // Use any for easier formatting initially
      tld: settings.tld,
      lang: settings.lang,
      query, // Raw query, URL encoding handled later
      tbs: settings.tbs,
      safe: settings.safe,
      country: settings.country,
      num: settings.num,
      start: currentStart,
    }

    if (currentStart === 0) {
      urlTemplate = settings.num === 10 ? config.urls.search : config.urls.searchNum
    }
    else {
      urlTemplate = settings.num === 10 ? config.urls.nextPage : config.urls.nextPageNum
    }

    // Construct the base URL object
    const baseUrl = new URL(formatUrl(urlTemplate, urlParams)) // Basic template formatting

    // Properly encode query and add all parameters using URLSearchParams
    const searchParams = new URLSearchParams()
    searchParams.set('q', query) // Ensure query is encoded correctly
    if (baseUrl.search) { // Add params from template if any
      const baseParams = new URLSearchParams(baseUrl.search)
      baseParams.forEach((value, key) => {
        if (key !== 'q')
          searchParams.set(key, value) // Avoid double 'q'
      })
    }
    searchParams.set('lr', `lang_${settings.lang}`)
    searchParams.set('tbs', settings.tbs)
    searchParams.set('safe', settings.safe)
    if (settings.country)
      searchParams.set('cr', settings.country)
    searchParams.set('num', String(settings.num))
    if (currentStart > 0)
      searchParams.set('start', String(currentStart))
    searchParams.set('filter', '0') // Explicitly keep filter=0

    // Add extra parameters
    if (settings.extraParams) {
      for (const [key, value] of Object.entries(settings.extraParams)) {
        searchParams.set(key, value)
      }
    }

    // Final URL string
    baseUrl.search = searchParams.toString()
    const url = baseUrl.toString()

    // Pause
    await sleep(settings.pause)

    let html: string
    try {
      console.log(`Workspaceing: ${url} with UA: ${userAgent}`)
      html = await httpClient.getPage(url, userAgent)
      // console.log("HTML fetched successfully."); // Debug logging
      // console.log(html.substring(0, 500)); // Log beginning of HTML for checks
    }
    catch (error) {
      console.error(`Failed to fetch or process page ${url}:`, error)
      // Decide how to handle errors: stop iteration, skip, retry?
      // For now, we stop the generator on fetch error.
      return // Stop the generator
    }

    const links = parseHtml(html, settings.includeGoogleLinks)
    // console.log(`Parsed ${links.length} links.`); // Debug logging

    for (const link of links) {
      // Simple hash (the URL itself is unique enough for this purpose)
      const h = link
      if (!hashes.has(h)) {
        hashes.add(h)
        yield link
        count++
        if (settings.stop !== null && count >= settings.stop) {
          console.log(`Reached stop limit: ${settings.stop}`)
          return // Stop the generator
        }
      }
    }

    // Check if no new results were found
    if (lastCount === count && links.length > 0) {
      console.log('No new unique results found on this page. Might be the end.')
      // Potential improvement: Check for a "next page" link explicitly
      // If no next page link, break even if count didn't change much.
    }
    if (links.length === 0 && count > 0) {
      console.log('No results links found on the page. Assuming end of results.')
      break // No links found at all, likely end of results.
    }
    if (lastCount === count && currentStart > 0 && links.length === 0) {
      console.log('No new results and no links found on subsequent page. Definite end.')
      break
    }

    // Prepare for next iteration
    currentStart += settings.num
  }
  console.log('Search finished or stopped.')
}

// Shortcut "I'm Feeling Lucky"
export async function lucky(
  query: string,
  options?: Omit<SearchOptions, 'stop'>, // 'stop' is irrelevant for lucky
): Promise<string | null> {
  // Ensure we only ask for 1 result and stop immediately
  const searchOptions: SearchOptions = {
    ...options,
    num: 1, // Get at least one result page
    stop: 1, // Stop after yielding the first result
  }
  const generator = search(query, searchOptions)
  const result = await generator.next()

  if (!result.done) {
    return result.value // Return the first yielded value
  }
  else {
    return null // No results found
  }
}
