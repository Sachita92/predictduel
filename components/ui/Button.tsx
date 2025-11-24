'use client'

import { ButtonHTMLAttributes, forwardRef, ReactNode, Ref } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  glow?: boolean
  children: ReactNode
  className?: string
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (props: ButtonProps, ref: Ref<HTMLButtonElement>) => {
    const { 
      className = '', 
      variant = 'primary', 
      size = 'md', 
      glow = false, 
      children, 
      type = 'button',
      ...restProps 
    } = props
    
    const baseStyles = 'font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'gradient-primary text-white shadow-lg hover:shadow-xl',
      secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20',
      destructive: 'bg-danger text-white hover:bg-red-600',
      outline: 'border-2 border-primary-from text-primary-from hover:bg-primary-from/10',
      ghost: 'text-white/80 hover:text-white hover:bg-white/10',
    }
    
    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    }
    
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          baseStyles,
          variants[variant as keyof typeof variants],
          sizes[size as keyof typeof sizes],
          glow && 'animate-glow',
          className
        )}
        {...restProps}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button

