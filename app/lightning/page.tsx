'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trophy, RotateCcw, Loader2 } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface LightningDuel {
  id: string
  question: string
  category: string
  outcome: 'yes' | 'no'
}

export default function LightningPage() {
  const [timeLeft, setTimeLeft] = useState(60)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [gameActive, setGameActive] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [lastResult, setLastResult] = useState<'correct' | 'wrong' | null>(null)
  const [duels, setDuels] = useState<LightningDuel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch resolved duels for lightning round
  useEffect(() => {
    const fetchDuels = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch('/api/lightning?limit=100')
        const data = await response.json()
        
        if (data.success && data.duels && data.duels.length > 0) {
          // Shuffle duels for variety
          const shuffled = [...data.duels].sort(() => Math.random() - 0.5)
          setDuels(shuffled)
        } else {
          setError('No resolved duels available. Play some duels first!')
        }
      } catch (err) {
        console.error('Error fetching lightning duels:', err)
        setError('Failed to load questions. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDuels()
  }, [])
  
  useEffect(() => {
    if (!gameActive || gameOver) return
    
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setGameOver(true)
    }
  }, [timeLeft, gameActive, gameOver])
  
  const handleAnswer = (answer: 'yes' | 'no') => {
    if (duels.length === 0) return
    
    const currentDuel = duels[currentQuestion]
    if (!currentDuel) return
    
    // Check answer against actual outcome
    const isCorrect = answer === currentDuel.outcome
    
    if (isCorrect) {
      setScore(score + (streak + 1) * 10)
      setStreak(streak + 1)
      setLastResult('correct')
    } else {
      setStreak(0)
      setLastResult('wrong')
    }
    
    setTimeout(() => {
      // Move to next question, cycle through available duels
      setCurrentQuestion((prev) => (prev + 1) % duels.length)
      setLastResult(null)
    }, 1000)
  }
  
  const startGame = () => {
    if (duels.length === 0) {
      setError('No questions available. Please try again later.')
      return
    }
    setGameActive(true)
    setTimeLeft(60)
    setScore(0)
    setStreak(0)
    setCurrentQuestion(0)
    setGameOver(false)
    setError(null)
  }
  
  if (!gameActive) {
    return (
      <div className="min-h-screen bg-background-dark pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card variant="glass" className="p-8 text-center max-w-md w-full">
            {loading ? (
              <>
                <Loader2 className="mx-auto mb-4 animate-spin text-primary-from" size={48} />
                <h1 className="text-4xl font-bold mb-4 font-display">Loading Questions...</h1>
                <p className="text-white/70">Preparing your lightning round</p>
              </>
            ) : error ? (
              <>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-6xl mb-4"
                >
                  ⚡
                </motion.div>
                <h1 className="text-4xl font-bold mb-4 font-display">Lightning Round</h1>
                <p className="text-white/70 mb-4 text-danger">{error}</p>
                <Button size="lg" glow onClick={() => window.location.reload()} className="w-full">
                  <RotateCcw className="mr-2" size={20} />
                  Retry
                </Button>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="text-6xl mb-4"
                >
                  ⚡
                </motion.div>
                <h1 className="text-4xl font-bold mb-4 font-display">Lightning Round</h1>
                <p className="text-white/70 mb-8">
                  Answer as many predictions as you can in 60 seconds!
                  <br />
                  Streaks multiply your points.
                  <br />
                  <span className="text-sm text-white/50 mt-2 block">
                    {duels.length} questions ready
                  </span>
                </p>
                <Button size="lg" glow onClick={startGame} className="w-full" disabled={duels.length === 0}>
                  <Zap className="mr-2" size={20} />
                  Start Lightning Round
                </Button>
              </>
            )}
          </Card>
        </div>
        <MobileNav />
      </div>
    )
  }
  
  if (gameOver) {
    return (
      <div className="min-h-screen bg-background-dark pb-20">
        <TopNav />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <Card variant="gradient" className="p-8 text-center max-w-md w-full">
            <Trophy className="mx-auto mb-4 text-accent" size={48} />
            <h1 className="text-3xl font-bold mb-4">Game Over!</h1>
            <div className="text-5xl font-bold gradient-text mb-2">{score}</div>
            <div className="text-white/60 mb-8">Total Score</div>
            <div className="space-y-3">
              <Button size="lg" glow onClick={startGame} className="w-full">
                <RotateCcw className="mr-2" size={20} />
                Play Again
              </Button>
              <Button variant="ghost" onClick={() => setGameActive(false)} className="w-full">
                Back to Menu
              </Button>
            </div>
          </Card>
        </div>
        <MobileNav />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 relative">
        {/* Lightning Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-from/20 rounded-full blur-3xl"
          />
          <motion.div
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary-to/20 rounded-full blur-3xl"
          />
        </div>
        
        {/* Score & Timer */}
        <div className="flex items-center justify-between w-full max-w-md mb-8 z-10">
          <Card variant="glass" className="px-6 py-3">
            <div className="text-sm text-white/60 mb-1">Score</div>
            <div className="text-2xl font-bold">{score}</div>
          </Card>
          
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className={`
              text-6xl font-bold font-mono
              ${timeLeft <= 10 ? 'text-danger animate-pulse' : 'text-accent'}
            `}
          >
            {timeLeft}s
          </motion.div>
          
          <Card variant="glass" className="px-6 py-3">
            <div className="text-sm text-white/60 mb-1">Streak</div>
            <div className="text-2xl font-bold flex items-center gap-1 text-accent">
              <Zap size={20} />
              {streak}
            </div>
          </Card>
        </div>
        
        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-md z-10"
          >
            <Card variant="glass" className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-8">
                {duels[currentQuestion]?.question || 'Loading question...'}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={() => handleAnswer('no')}
                  className="text-xl font-bold"
                >
                  NO
                </Button>
                <Button
                  size="lg"
                  variant="primary"
                  onClick={() => handleAnswer('yes')}
                  className="text-xl font-bold bg-success hover:bg-green-600"
                >
                  YES
                </Button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
        
        {/* Result Flash */}
        <AnimatePresence>
          {lastResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`
                fixed inset-0 flex items-center justify-center z-50 pointer-events-none
                ${lastResult === 'correct' ? 'bg-success/20' : 'bg-danger/20'}
              `}
            >
              <div className={`
                text-8xl font-bold
                ${lastResult === 'correct' ? 'text-success' : 'text-danger'}
              `}>
                {lastResult === 'correct' ? '✓' : '✗'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <MobileNav />
    </div>
  )
}

