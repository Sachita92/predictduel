import type { Metadata } from 'next'
import './globals.css'
import PrivyProviderWrapper from '@/components/providers/PrivyProviderWrapper'

export const metadata: Metadata = {
  title: 'PredictDuel - Social Prediction Battles on Solana',
  description: 'Challenge friends to prediction battles and win cryptocurrency instantly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PrivyProviderWrapper>
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  )
}

