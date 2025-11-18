'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import TopNav from '@/components/navigation/TopNav'
import MobileNav from '@/components/navigation/MobileNav'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const categories = [
  { id: 'crypto', icon: '💰', label: 'Crypto Prices' },
  { id: 'weather', icon: '⛅', label: 'Weather' },
  { id: 'sports', icon: '⚽', label: 'Sports' },
  { id: 'meme', icon: '🎭', label: 'Meme/Fun' },
  { id: 'local', icon: '🏙️', label: 'Local (Kathmandu)' },
]

const quickDeadlines = [
  { label: '1hr', value: 3600000 },
  { label: '24hr', value: 86400000 },
  { label: '1 week', value: 604800000 },
]

export default function CreatePage() {
  const [step, setStep] = useState(1)
  const [category, setCategory] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [stake, setStake] = useState(0.1)
  const [deadline, setDeadline] = useState(86400000)
  const [duelType, setDuelType] = useState<'friend' | 'public'>('public')
  
  const totalSteps = 4
  
  const handleNext = () => {
    if (step < totalSteps) setStep(step + 1)
  }
  
  const handleBack = () => {
    if (step > 1) setStep(step - 1)
  }
  
  const handleLaunch = () => {
    // Launch logic here
    console.log('Launching duel:', { category, question, stake, deadline, duelType })
    // Show success animation
  }
  
  return (
    <div className="min-h-screen bg-background-dark pb-20">
      <TopNav />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex-1">
                  <div className={`
                    h-2 rounded-full transition-all
                    ${i + 1 <= step ? 'gradient-primary' : 'bg-white/10'}
                  `} />
                </div>
                {i < totalSteps - 1 && (
                  <div className={`
                    w-2 h-2 rounded-full mx-2 transition-all
                    ${i + 1 < step ? 'gradient-primary' : 'bg-white/10'}
                  `} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-white/60">
            Step {step} of {totalSteps}
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Step 1: Choose Category */}
            {step === 1 && (
              <Card variant="glass" className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Choose Category</h2>
                <div className="grid grid-cols-2 gap-4">
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`
                        p-6 rounded-xl border-2 transition-all
                        ${category === cat.id
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      <div className="text-4xl mb-2">{cat.icon}</div>
                      <div className="font-semibold">{cat.label}</div>
                    </motion.button>
                  ))}
                </div>
              </Card>
            )}
            
            {/* Step 2: Write Prediction */}
            {step === 2 && (
              <Card variant="glass" className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Write Your Prediction</h2>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Will SOL hit $200 this week?"
                  maxLength={100}
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:border-primary-from focus:ring-2 focus:ring-primary-from/50 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <div className="text-sm text-white/60">
                    {question.length}/100 characters
                  </div>
                  <div className="flex gap-2">
                    {['Will it rain tomorrow?', 'Will BTC pump?', 'Will SOL hit $200?'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setQuestion(suggestion)}
                        className="text-xs px-3 py-1 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </Card>
            )}
            
            {/* Step 3: Set Parameters */}
            {step === 3 && (
              <Card variant="glass" className="p-8 space-y-6">
                <h2 className="text-3xl font-bold mb-6 text-center">Set Parameters</h2>
                
                <div>
                  <label className="block mb-2 font-semibold">Stake Amount</label>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0.01"
                      max="1"
                      step="0.01"
                      value={stake}
                      onChange={(e) => setStake(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-white/60">
                      <span>0.01 SOL</span>
                      <span className="text-lg font-bold text-white">{stake.toFixed(2)} SOL</span>
                      <span>1 SOL</span>
                    </div>
                    <div className="text-sm text-white/40 text-center">
                      ≈ ${(stake * 100).toFixed(2)} USD
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold">Deadline</label>
                  <div className="flex gap-2 mb-4">
                    {quickDeadlines.map((qd) => (
                      <button
                        key={qd.label}
                        onClick={() => setDeadline(qd.value)}
                        className={`
                          px-4 py-2 rounded-lg transition-all
                          ${deadline === qd.value
                            ? 'gradient-primary'
                            : 'bg-white/5 hover:bg-white/10'
                          }
                        `}
                      >
                        {qd.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="datetime-local"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-primary-from"
                  />
                </div>
                
                <div>
                  <label className="block mb-2 font-semibold">Duel Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDuelType('friend')}
                      className={`
                        p-4 rounded-xl border-2 transition-all
                        ${duelType === 'friend'
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      Challenge Friend
                    </button>
                    <button
                      onClick={() => setDuelType('public')}
                      className={`
                        p-4 rounded-xl border-2 transition-all
                        ${duelType === 'public'
                          ? 'border-primary-from gradient-primary'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }
                      `}
                    >
                      Public Pool
                    </button>
                  </div>
                </div>
              </Card>
            )}
            
            {/* Step 4: Preview & Launch */}
            {step === 4 && (
              <Card variant="glass" className="p-8">
                <h2 className="text-3xl font-bold mb-6 text-center">Preview & Launch</h2>
                
                <Card variant="default" className="p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
                      You
                    </div>
                    <div>
                      <div className="font-semibold">Your Prediction</div>
                      <Badge variant="info">{category}</Badge>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-4">{question}</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Stake:</span>
                    <span className="font-bold">{stake.toFixed(2)} SOL</span>
                  </div>
                </Card>
                
                <div className="text-center mb-6">
                  <div className="text-2xl font-bold gradient-text mb-2">
                    Estimated Winnings: {(stake * 1.8).toFixed(2)} SOL
                  </div>
                  <div className="text-sm text-white/60">
                    (if you win)
                  </div>
                </div>
                
                <Button
                  size="lg"
                  glow
                  onClick={handleLaunch}
                  className="w-full text-lg"
                >
                  Launch Duel 🚀
                </Button>
              </Card>
            )}
          </motion.div>
        </AnimatePresence>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="mr-2" size={20} />
            Back
          </Button>
          
          {step < totalSteps ? (
            <Button onClick={handleNext} disabled={step === 1 && !category || step === 2 && !question}>
              Next
              <ArrowRight className="ml-2" size={20} />
            </Button>
          ) : (
            <Button onClick={handleLaunch} glow className="w-full">
              Launch Duel 🚀
            </Button>
          )}
        </div>
      </div>
      
      <MobileNav />
    </div>
  )
}

