/**
 * Secure Storage Utilities
 * Provides encrypted storage for sensitive data like tokens
 */

// Storage keys
const STORAGE_PREFIX = 'tax_secure_'
const ENCRYPTION_KEY_NAME = `${STORAGE_PREFIX}ek`

/**
 * Generate a random encryption key using Web Crypto API
 */
async function generateEncryptionKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Export key to storable format
 */
async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  return btoa(String.fromCharCode(...new Uint8Array(exported)))
}

/**
 * Import key from stored format
 */
async function importKey(keyString: string): Promise<CryptoKey> {
  const keyData = Uint8Array.from(atob(keyString), (c) => c.charCodeAt(0))
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Get or create the encryption key
 */
async function getOrCreateKey(): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) {
    return null
  }

  try {
    // Try to get existing key from sessionStorage (more secure than localStorage)
    const storedKey = sessionStorage.getItem(ENCRYPTION_KEY_NAME)

    if (storedKey) {
      return await importKey(storedKey)
    }

    // Generate new key
    const newKey = await generateEncryptionKey()
    const exportedKey = await exportKey(newKey)
    sessionStorage.setItem(ENCRYPTION_KEY_NAME, exportedKey)

    return newKey
  } catch (error) {
    console.warn('Failed to get/create encryption key:', error)
    return null
  }
}

/**
 * Encrypt data using AES-GCM
 */
async function encrypt(data: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  )

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-GCM
 */
async function decrypt(encryptedData: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0))

  // Extract IV and encrypted data
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Secure storage class for managing encrypted data
 */
class SecureStorage {
  private key: CryptoKey | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Initialize the secure storage
   */
  async init(): Promise<void> {
    if (this.initialized) return

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      this.key = await getOrCreateKey()
      this.initialized = true
    })()

    return this.initPromise
  }

  /**
   * Set an encrypted value
   */
  async setItem(key: string, value: string): Promise<void> {
    await this.init()

    if (!this.key) {
      // Fallback to regular localStorage if encryption not available
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value)
      return
    }

    try {
      const encrypted = await encrypt(value, this.key)
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, encrypted)
    } catch (error) {
      console.warn('Encryption failed, using plain storage:', error)
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value)
    }
  }

  /**
   * Get a decrypted value
   */
  async getItem(key: string): Promise<string | null> {
    await this.init()

    const stored = localStorage.getItem(`${STORAGE_PREFIX}${key}`)
    if (!stored) return null

    if (!this.key) {
      return stored
    }

    try {
      return await decrypt(stored, this.key)
    } catch (error) {
      // Might be unencrypted data, return as-is
      console.warn('Decryption failed, returning raw value:', error)
      return stored
    }
  }

  /**
   * Remove an item
   */
  removeItem(key: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`)
  }

  /**
   * Clear all secure storage items
   */
  clear(): void {
    const keysToRemove: string[] = []

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    // Also clear the encryption key
    sessionStorage.removeItem(ENCRYPTION_KEY_NAME)
    this.key = null
    this.initialized = false
    this.initPromise = null
  }
}

// Singleton instance
export const secureStorage = new SecureStorage()

/**
 * Token-specific secure storage functions
 */
export const tokenStorage = {
  async setAuthToken(token: string): Promise<void> {
    await secureStorage.setItem('auth_token', token)
  },

  async getAuthToken(): Promise<string | null> {
    return secureStorage.getItem('auth_token')
  },

  async setRefreshToken(token: string): Promise<void> {
    await secureStorage.setItem('refresh_token', token)
  },

  async getRefreshToken(): Promise<string | null> {
    return secureStorage.getItem('refresh_token')
  },

  async setUser(user: object): Promise<void> {
    await secureStorage.setItem('user', JSON.stringify(user))
  },

  async getUser<T>(): Promise<T | null> {
    const stored = await secureStorage.getItem('user')
    if (!stored) return null

    try {
      return JSON.parse(stored) as T
    } catch {
      return null
    }
  },

  clearAll(): void {
    secureStorage.clear()
  },
}

/**
 * Simple synchronous token access for compatibility
 * Uses in-memory cache updated by async operations
 */
class TokenCache {
  private authToken: string | null = null
  private refreshToken: string | null = null
  private initialized = false

  async init(): Promise<void> {
    if (this.initialized) return

    this.authToken = await tokenStorage.getAuthToken()
    this.refreshToken = await tokenStorage.getRefreshToken()
    this.initialized = true
  }

  getAuthToken(): string | null {
    return this.authToken
  }

  getRefreshToken(): string | null {
    return this.refreshToken
  }

  async setAuthToken(token: string): Promise<void> {
    this.authToken = token
    await tokenStorage.setAuthToken(token)
  }

  async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token
    await tokenStorage.setRefreshToken(token)
  }

  clear(): void {
    this.authToken = null
    this.refreshToken = null
    this.initialized = false
    tokenStorage.clearAll()
  }
}

export const tokenCache = new TokenCache()

// Initialize token cache on load
if (typeof window !== 'undefined') {
  tokenCache.init().catch(console.error)
}
