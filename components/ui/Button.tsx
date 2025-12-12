import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'destructive' | 'success'
  size?: 'sm' | 'md' | 'lg'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      default: 'bg-brand-purple text-white hover:bg-brand-purple/90 shadow-soft',
      ghost: 'hover:bg-gray-100 text-gray-700',
      outline: 'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700 shadow-soft',
      success: 'bg-brand-success text-white hover:bg-brand-success/90 shadow-soft',
    }
    
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }
    
    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`
    
    return <button ref={ref} className={classes} {...props} />
  }
)

Button.displayName = 'Button'

export default Button
