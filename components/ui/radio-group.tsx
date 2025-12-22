'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({})

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children: React.ReactNode
  className?: string
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ value, onValueChange, disabled, children, className }, ref) => {
    return (
      <RadioGroupContext.Provider value={{ value, onValueChange, disabled }}>
        <div ref={ref} className={cn('grid gap-2', className)} role="radiogroup">
          {children}
        </div>
      </RadioGroupContext.Provider>
    )
  }
)
RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps {
  value: string
  id: string
  disabled?: boolean
  className?: string
}

export const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  ({ value, id, disabled: itemDisabled, className }, ref) => {
    const { value: groupValue, onValueChange, disabled: groupDisabled } = React.useContext(RadioGroupContext)
    const isChecked = groupValue === value
    const isDisabled = itemDisabled || groupDisabled

    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={isChecked}
        id={id}
        disabled={isDisabled}
        onClick={() => !isDisabled && onValueChange?.(value)}
        className={cn(
          'aspect-square h-4 w-4 rounded-full border border-gray-300 text-primary ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          isChecked && 'border-brand-purple bg-brand-purple',
          className
        )}
      >
        {isChecked && (
          <span className="flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
        )}
      </button>
    )
  }
)
RadioGroupItem.displayName = 'RadioGroupItem'
