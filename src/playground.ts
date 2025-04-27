import type { SearchOptions } from './types'
import { lucky, search } from './googleSearch'
import { getTbs } from './utils'

async function main() {
  try {
    console.log('--- Performing standard search ---')
    const searchQuery = 'Model Context Protocol'
    const options: SearchOptions = {
      lang: 'en',
      num: 5, // Get 5 results per page
      stop: 12, // Stop after getting 12 results total
      pause: 1500, // Pause 1.5 seconds between requests
      // tld: 'co.kr', // Example: Search on google.co.kr
      // tbs: 'qdr:m', // Example: Results from the past month
      // tbs: getTbs(new Date(2024, 0, 1), new Date(2024, 11, 31)), // Example: Date range
      // userAgent: 'MyCustomBot/1.0', // Example: Custom User Agent
    }

    let resultCount = 0
    for await (const url of search(searchQuery, options)) {
      resultCount++
      console.log(`${resultCount}. ${url}`)
    }
    console.log(`Standard search finished. Found ${resultCount} results.`)

    console.log('\n--- Performing \'I\'m Feeling Lucky\' search ---')
    const luckyQuery = 'Cheerio npm'
    const luckyResult = await lucky(luckyQuery, { lang: 'en' })

    if (luckyResult) {
      console.log(`Lucky result for "${luckyQuery}": ${luckyResult}`)
    }
    else {
      console.log(`No lucky result found for "${luckyQuery}".`)
    }
  }
  catch (error) {
    console.error('\nAn error occurred during the search:', error)
  }
}

main()
