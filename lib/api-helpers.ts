import { NextApiRequest, NextApiResponse } from 'next'
import connectDB from './mongodb'

/**
 * Wrapper for API routes to handle MongoDB connection
 * Usage:
 * export default async function handler(req: NextApiRequest, res: NextApiResponse) {
 *   return withDB(async (req, res) => {
 *     // Your API logic here
 *     res.json({ success: true })
 *   })(req, res)
 * }
 */
export function withDB(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await connectDB()
      return handler(req, res)
    } catch (error) {
      console.error('Database connection error:', error)
      return res.status(500).json({ error: 'Database connection failed' })
    }
  }
}

/**
 * Helper to get user ID from Privy authentication
 * This should be adapted based on your Privy setup
 */
export async function getUserIdFromRequest(req: NextApiRequest): Promise<string | null> {
  // TODO: Extract Privy user ID from request headers/cookies
  // This is a placeholder - implement based on your Privy auth setup
  const privyId = req.headers['x-privy-id'] as string
  return privyId || null
}

