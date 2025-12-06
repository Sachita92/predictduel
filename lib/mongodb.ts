import mongoose, { Mongoose } from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable inside .env.local'
  )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDB(): Promise<Mongoose> {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
    }

    // Handle SSL/TLS for MongoDB Atlas connections
    // MongoDB Atlas (mongodb+srv://) requires TLS by default
    if (MONGODB_URI.includes('mongodb+srv://')) {
      opts.tls = true
      // For development, allow invalid certificates if needed (e.g., corporate proxy)
      // WARNING: Only use this in development, never in production
      if (process.env.NODE_ENV === 'development' && process.env.MONGODB_ALLOW_INVALID_CERT === 'true') {
        opts.tlsAllowInvalidCertificates = true
        console.warn('⚠️  WARNING: Allowing invalid TLS certificates for MongoDB. This should only be used in development!')
      }
    } else if (MONGODB_URI.includes('ssl=true')) {
      // Explicit SSL parameter in connection string
      opts.tls = true
      if (process.env.NODE_ENV === 'development' && process.env.MONGODB_ALLOW_INVALID_CERT === 'true') {
        opts.tlsAllowInvalidCertificates = true
        console.warn('⚠️  WARNING: Allowing invalid TLS certificates for MongoDB. This should only be used in development!')
      }
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts)
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  if (!cached.conn) {
    throw new Error('Failed to establish MongoDB connection')
  }

  return cached.conn
}

export default connectDB

