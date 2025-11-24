/**
 * Seed script to populate initial achievements
 * Run with: npx ts-node scripts/seed-achievements.ts
 * 
 * Make sure MONGODB_URI is set in your environment
 */

import mongoose from 'mongoose'
import Achievement from '../models/Achievement'

const achievements = [
  {
    name: 'First Blood',
    description: 'Win your first prediction',
    icon: '⚔️',
    rarity: 'common',
    requirement: {
      type: 'wins',
      value: 1,
    },
  },
  {
    name: 'Prophet',
    description: 'Make 10 correct predictions',
    icon: '🔮',
    rarity: 'common',
    requirement: {
      type: 'wins',
      value: 10,
    },
  },
  {
    name: 'Streak Master',
    description: 'Achieve a 5-win streak',
    icon: '🔥',
    rarity: 'rare',
    requirement: {
      type: 'streak',
      value: 5,
    },
  },
  {
    name: 'Crypto Oracle',
    description: 'Win 20 crypto predictions',
    icon: '💰',
    rarity: 'epic',
    requirement: {
      type: 'category',
      value: 20,
      category: 'Crypto',
    },
  },
  {
    name: 'Weather Wizard',
    description: 'Win 15 weather predictions',
    icon: '⛅',
    rarity: 'rare',
    requirement: {
      type: 'category',
      value: 15,
      category: 'Weather',
    },
  },
  {
    name: 'Unstoppable',
    description: 'Achieve a 10-win streak',
    icon: '💪',
    rarity: 'legendary',
    requirement: {
      type: 'streak',
      value: 10,
    },
  },
  {
    name: 'High Roller',
    description: 'Earn 10 SOL total',
    icon: '💎',
    rarity: 'epic',
    requirement: {
      type: 'earnings',
      value: 10,
    },
  },
  {
    name: 'Social Butterfly',
    description: 'Participate in 50 predictions',
    icon: '🦋',
    rarity: 'common',
    requirement: {
      type: 'predictions',
      value: 50,
    },
  },
]

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set')
    }

    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Clear existing achievements (optional - comment out to keep existing)
    // await Achievement.deleteMany({})
    // console.log('Cleared existing achievements')

    // Insert achievements
    for (const achievement of achievements) {
      const existing = await Achievement.findOne({ name: achievement.name })
      if (!existing) {
        await Achievement.create(achievement)
        console.log(`Created achievement: ${achievement.name}`)
      } else {
        console.log(`Achievement already exists: ${achievement.name}`)
      }
    }

    console.log('✅ Seeding completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()

