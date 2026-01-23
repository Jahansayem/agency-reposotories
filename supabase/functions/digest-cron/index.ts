/**
 * Supabase Edge Function: Daily Digest Cron
 *
 * Triggers the Next.js API endpoint to generate daily digests.
 * Scheduled via Supabase cron:
 * - Morning: 5am Pacific (1pm UTC)
 * - Afternoon: 4pm Pacific (12am UTC)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Environment variables
const NETLIFY_URL = Deno.env.get('NETLIFY_URL') || Deno.env.get('NEXT_PUBLIC_SITE_URL')
const API_KEY = Deno.env.get('OUTLOOK_ADDON_API_KEY')

interface DigestResponse {
  success: boolean
  digestType?: string
  generated?: number
  notified?: number
  failed?: number
  duration?: string
  error?: string
  results?: Array<{
    userName: string
    generated: boolean
    notified: boolean
    error?: string
  }>
}

serve(async (req: Request) => {
  const startTime = Date.now()

  try {
    // Parse request
    const url = new URL(req.url)
    const digestType = url.searchParams.get('type') || 'morning'

    // Validate digest type
    if (digestType !== 'morning' && digestType !== 'afternoon') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid digest type. Must be "morning" or "afternoon".',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate environment variables
    if (!NETLIFY_URL) {
      console.error('NETLIFY_URL or NEXT_PUBLIC_SITE_URL not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Site URL not configured',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    if (!API_KEY) {
      console.error('OUTLOOK_ADDON_API_KEY not configured')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'API key not configured',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log(`[${digestType}] Triggering digest generation at ${NETLIFY_URL}`)

    // Call your Next.js API endpoint
    const apiUrl = `${NETLIFY_URL}/api/digest/generate?type=${digestType}`
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
    })

    const data: DigestResponse = await response.json()
    const duration = Date.now() - startTime

    if (!response.ok) {
      console.error(`[${digestType}] Digest generation failed:`, data)
      return new Response(
        JSON.stringify({
          success: false,
          digestType,
          error: data.error || 'API request failed',
          statusCode: response.status,
          duration: `${duration}ms`,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: response.status,
        }
      )
    }

    console.log(`[${digestType}] Digest generation succeeded:`, {
      generated: data.generated,
      notified: data.notified,
      failed: data.failed,
      duration: `${duration}ms`,
    })

    return new Response(
      JSON.stringify({
        success: true,
        digestType,
        generated: data.generated || 0,
        notified: data.notified || 0,
        failed: data.failed || 0,
        duration: `${duration}ms`,
        apiDuration: data.duration,
        results: data.results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    console.error('Edge Function error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        duration: `${duration}ms`,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
