import { createClient as createSupabaseClient } from "@supabase/supabase-js"

let runtimeConfig: { supabaseUrl: string; supabaseAnonKey: string } | null = null
let configPromise: Promise<void> | null = null

async function loadConfig() {
  if (runtimeConfig) return runtimeConfig

  if (!configPromise) {
    configPromise = fetch("/api/config")
      .then((res) => res.json())
      .then((config) => {
        runtimeConfig = config
      })
      .catch((err) => {
        console.error("Failed to load runtime config:", err)
        throw new Error("Could not load Supabase configuration")
      })
  }

  await configPromise
  return runtimeConfig!
}

let browserClient: ReturnType<typeof createSupabaseClient> | null = null
let clientPromise: Promise<ReturnType<typeof createSupabaseClient>> | null = null

export async function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  if (!clientPromise) {
    clientPromise = loadConfig().then((config) => {
      if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error("Supabase configuration is incomplete")
      }
      browserClient = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
      return browserClient
    })
  }

  return clientPromise
}

export async function createClient() {
  const config = await loadConfig()

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error("Supabase configuration is incomplete")
  }

  return createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey)
}

export function createClientSync() {
  if (!runtimeConfig) {
    throw new Error("Supabase configuration not loaded yet. Call initializeSupabase() first.")
  }

  if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseAnonKey) {
    throw new Error("Supabase configuration is incomplete")
  }

  return createSupabaseClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey)
}

export async function initializeSupabase() {
  await loadConfig()
}

export async function getClient() {
  return getSupabaseBrowserClient()
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("Missing Supabase URL environment variable")
  }

  // Server-side with service role key
  if (typeof window === "undefined" && serviceKey) {
    return createSupabaseClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // Fallback to anon key
  if (!anonKey) {
    throw new Error("Missing Supabase anon key")
  }

  return createSupabaseClient(supabaseUrl, anonKey)
}
