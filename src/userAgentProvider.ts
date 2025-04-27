import * as fs from 'node:fs'
import * as path from 'node:path'
import * as zlib from 'node:zlib'
import { config } from './config'

let userAgents: string[] = [config.defaultUserAgent]
let loaded = false

function loadUserAgentsFromFile(): void {
  if (loaded)
    return

  const installFolder = path.dirname(__filename) // or determine install folder appropriately
  const gzPath = path.join(installFolder, 'user_agents.txt.gz')
  const txtPath = path.join(installFolder, 'user_agents.txt')

  try {
    if (fs.existsSync(gzPath)) {
      const fileContents = fs.readFileSync(gzPath)
      const unzipped = zlib.gunzipSync(fileContents)
      userAgents = unzipped.toString('utf-8').split('\n').map(ua => ua.trim()).filter(ua => ua)
      console.log(`Loaded ${userAgents.length} user agents from gzipped file.`)
    }
    else if (fs.existsSync(txtPath)) {
      const fileContents = fs.readFileSync(txtPath, 'utf-8')
      userAgents = fileContents.split('\n').map(ua => ua.trim()).filter(ua => ua)
      console.log(`Loaded ${userAgents.length} user agents from text file.`)
    }
    else {
      console.warn('User agent file not found. Using default user agent.')
    }
  }
  catch (error) {
    console.error('Error loading user agents:', error)
    // Fallback to default if loading fails
    userAgents = [config.defaultUserAgent]
  }
  finally {
    loaded = true
    if (userAgents.length === 0) {
      console.warn('No valid user agents loaded, using default.')
      userAgents = [config.defaultUserAgent]
    }
  }
}

export function getRandomUserAgent(): string {
  if (!loaded) {
    loadUserAgentsFromFile()
  }
  if (userAgents.length === 0) {
    return config.defaultUserAgent // Should not happen if loadUserAgentsFromFile works correctly
  }
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

// Initial load when the module is imported
// loadUserAgentsFromFile(); // Or lazy load inside getRandomUserAgent
