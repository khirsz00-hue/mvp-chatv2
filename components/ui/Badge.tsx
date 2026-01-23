import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'purple' | 'pink' | 'outline' | 'destructive'
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const isInteractive = 
      typeof props.onClick === 'function' || 
      typeof props.onPointerDown === 'function' ||
      typeof props.onKeyDown === 'function'
    const variants = {
      default: 'bg-gray-100 text-gray-800 border-gray-200',
      secondary: 'bg-blue-100 text-blue-800 border-blue-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      danger: 'bg-red-100 text-red-800 border-red-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      pink: 'bg-pink-100 text-pink-800 border-pink-200',
      outline: 'bg-white text-gray-700 border-gray-300',
      destructive: 'bg-red-500 text-white border-red-600',
    }
    
    return (
      <div
        ref={ref}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}
        onKeyDown={(e) => {
          if (!isInteractive) return
          const isActivateKey = e.key === 'Enter' || e.key === ' '
          if (!isActivateKey) return
          e.preventDefault()
          if (props.onClick) props.onClick(e as any)
          if (props.onPointerDown) props.onPointerDown(e as any)
          if (props.onKeyDown) props.onKeyDown(e)
        }}
        {...props}
      />
    )
  }
)
Badge.displayName = 'Badge'

export default Badge
