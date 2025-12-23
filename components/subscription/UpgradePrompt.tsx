'use client'

import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Sparkle } from '@phosphor-icons/react'

interface UpgradePromptProps {
  resource: string
  current: number
  limit: number
}

export default function UpgradePrompt({ resource, current, limit }: UpgradePromptProps) {
  const router = useRouter()

  return (
    <Card className="border-2 border-brand-purple">
      <CardHeader>
        <CardTitle className="text-xl">Osiągnięto limit planu Free</CardTitle>
        <CardDescription>
          Wykorzystano {current} z {limit} dostępnych {resource}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Przejdź na plan Pro, aby uzyskać nielimitowany dostęp do wszystkich funkcji.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          onClick={() => router.push('/subscription')}
          className="w-full bg-gradient-to-r from-brand-purple to-brand-pink"
        >
          <Sparkle size={20} className="mr-2" weight="fill" />
          Przejdź na Pro
        </Button>
      </CardFooter>
    </Card>
  )
}
