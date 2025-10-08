'use client'
import { motion } from 'framer-motion'

interface StepperProps {
  steps: { icon: string; color: string }[]
  current: number
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex justify-center mb-4">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          className={`w-8 h-8 mx-1 flex items-center justify-center rounded-full text-white`}
          style={{
            backgroundColor: i === current ? step.color : '#ccc',
            opacity: i <= current ? 1 : 0.5
          }}
          initial={{ scale: 0.8 }}
          animate={{ scale: i === current ? 1.1 : 1 }}
        >
          {step.icon}
        </motion.div>
      ))}
    </div>
  )
}
