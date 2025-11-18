'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DuelPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to a sample duel or show list
    router.push('/feed')
  }, [router])
  
  return null
}

