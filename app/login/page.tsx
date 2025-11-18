'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy } from '@privy-io/react-auth'
import { motion } from 'framer-motion'
import { Wallet, ArrowLeft } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function LoginPage() {
  const router = useRouter()
  const { ready, authenticated, login } = usePrivy()
  
  useEffect(() => {
    if (ready && authenticated) {
      router.push('/')
    }
  }, [ready, authenticated, router])
  
  const handlePrivyLogin = async () => {
    try {
      await login()
    } catch (error) {
      console.error('Login error:', error)
    }
  }
  
  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-4">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-10 w-96 h-96 bg-primary-from/30 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-primary-to/30 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-6"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          
          <Card variant="glass" className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                <Wallet size={40} className="text-white" />
              </div>
            </motion.div>
            
            <h1 className="text-3xl font-bold mb-2 font-display">
              Welcome to <span className="gradient-text">PredictDuel</span>
            </h1>
            <p className="text-white/70 mb-8">
              Connect your wallet to start making predictions and winning SOL
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                size="lg"
                glow
                onClick={handlePrivyLogin}
                className="w-full text-lg"
                disabled={!ready}
              >
                <Wallet size={20} className="mr-2" />
                Sign up with Privy
              </Button>
            </motion.div>
            
            <p className="text-sm text-white/50 mt-6">
              By connecting, you agree to PredictDuel's Terms of Service
            </p>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

