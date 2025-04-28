import { Buffer } from 'node:buffer'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as zlib from 'node:zlib'
import { config } from './config'

let userAgents: string[] = [config.defaultUserAgent]
let loaded = false

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const installFolder = resolve(__dirname, '..', 'data')

const downloadUrl = 'https://github.com/MarioVilas/googlesearch/raw/refs/heads/master/googlesearch/user_agents.txt.gz'

function assureInstallFolderExists(): void {
  if (!fs.existsSync(installFolder)) {
    fs.mkdirSync(installFolder, { recursive: true })
    console.log(`Created install folder: ${installFolder}`)
  }
}

function checkUserAgentFile(): boolean {
  const gzPath = path.join(installFolder, 'user_agents.txt.gz')
  const txtPath = path.join(installFolder, 'user_agents.txt')

  return fs.existsSync(gzPath) || fs.existsSync(txtPath)
}

async function downloadUserAgents(): Promise<void> {
  const gzPath = path.join(installFolder, 'user_agents.txt.gz')

  assureInstallFolderExists()

  try {
    const response = await fetch(downloadUrl)
    if (!response.ok) {
      throw new Error(`Failed to download user agents: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(gzPath, Buffer.from(buffer))
    console.log('User agents downloaded successfully.')
  }
  catch (error) {
    console.error('Error downloading user agents:', error)
  }
}

async function loadUserAgentsFromFile(): Promise<void> {
  if (loaded)
    return

  if (!checkUserAgentFile()) {
    console.warn('User agent file not found. Downloading...')
    await downloadUserAgents()
  }

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

export async function getRandomUserAgent(): Promise<string> {
  if (!loaded) {
    await loadUserAgentsFromFile()
  }

  if (userAgents.length === 0) {
    return config.defaultUserAgent // Should not happen if loadUserAgentsFromFile works correctly
  }
  return userAgents[Math.floor(Math.random() * userAgents.length)]
}

// Initial load when the module is imported
// loadUserAgentsFromFile(); // Or lazy load inside getRandomUserAgent
