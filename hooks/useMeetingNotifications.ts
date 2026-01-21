/**
 * useMeetingNotifications Hook
 * 
 * Manages meeting notifications logic:
 * - Monitors upcoming meetings and triggers notifications at configured times
 * - Handles browser notifications (with permission request)
 * - Plays notification sound (if enabled)
 * - Shows in-app banner (if enabled)
 * - Tracks which notifications have been shown to avoid duplicates
 * - Checks every 30 seconds for upcoming meetings
 */

'use client'

import { useEffect, useState, useCallback } from 'react'

interface Meeting {
  id: string
  title: string
  start_time: string
  date: string
  type: 'on-site' | 'online' | 'in-office'
  location?: string
  duration_minutes?: number
}

interface NotificationSettings {
  enabled: boolean
  defaultReminderTimes: number[]
  soundEnabled: boolean
  browserNotifications: boolean
  inAppBanner: boolean
}

interface UpcomingNotification {
  meetingId: string
  title: string
  start_time: string
  type: string
  location?: string
  minutesUntil: number
}

export function useMeetingNotifications(
  meetings: Meeting[],
  settings: NotificationSettings
) {
  const [upcomingNotification, setUpcomingNotification] = useState<UpcomingNotification | null>(null)
  const [notifiedMeetings, setNotifiedMeetings] = useState<Set<string>>(new Set())

  const playNotificationSound = useCallback(() => {
    if (!settings.soundEnabled) return
    
    try {
      // Play browser notification sound
      // Using a data URI for a simple beep sound as fallback
      const audio = new Audio('/sounds/notification.mp3')
      audio.play().catch((err) => {
        console.warn('Could not play notification sound:', err)
        // Fallback to browser beep
        const context = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(context.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5)
        
        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.5)
      })
    } catch (err) {
      console.error('Error playing notification sound:', err)
    }
  }, [settings.soundEnabled])

  const showBrowserNotification = useCallback((meeting: Meeting, minutesUntil: number) => {
    if (!settings.browserNotifications) return
    
    // Request permission if not granted
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          // Retry showing notification after permission granted
          showBrowserNotification(meeting, minutesUntil)
        }
      })
      return
    }
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(`Spotkanie za ${minutesUntil} min`, {
          body: meeting.title,
          icon: '/icons/meeting-icon.png',
          tag: meeting.id,
          requireInteraction: true // Stay visible until user interacts
        })
        
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      } catch (err) {
        console.error('Error showing browser notification:', err)
      }
    }
  }, [settings.browserNotifications])

  const checkUpcomingMeetings = useCallback(() => {
    if (!settings.enabled) return

    const now = new Date()
    const todayISO = now.toISOString().split('T')[0]

    for (const meeting of meetings) {
      // Only check today's meetings
      if (meeting.date !== todayISO) continue

      // Parse meeting start time
      const [hours, minutes] = meeting.start_time.split(':').map(Number)
      const meetingTime = new Date(now)
      meetingTime.setHours(hours, minutes, 0, 0)

      const minutesUntil = Math.floor((meetingTime.getTime() - now.getTime()) / 1000 / 60)

      // Skip if meeting already passed
      if (minutesUntil < 0) continue

      // Check if we should notify for any reminder time
      for (const reminderTime of settings.defaultReminderTimes) {
        const notificationKey = `${meeting.id}-${reminderTime}`
        
        // Check if within reminder window (±1 min for tolerance)
        if (Math.abs(minutesUntil - reminderTime) <= 1 && !notifiedMeetings.has(notificationKey)) {
          console.log(`🔔 Notification triggered: ${meeting.title} in ${minutesUntil} min`)
          
          // Mark as notified
          setNotifiedMeetings(prev => new Set(prev).add(notificationKey))
          
          // Show in-app banner
          if (settings.inAppBanner) {
            setUpcomingNotification({
              meetingId: meeting.id,
              title: meeting.title,
              start_time: meeting.start_time,
              type: meeting.type,
              location: meeting.location,
              minutesUntil
            })
          }
          
          // Play sound
          playNotificationSound()
          
          // Show browser notification
          showBrowserNotification(meeting, minutesUntil)
          
          break // Only one notification per check
        }
      }
    }
  }, [meetings, settings, notifiedMeetings, playNotificationSound, showBrowserNotification])

  // Check every 30 seconds
  useEffect(() => {
    if (!settings.enabled) return

    checkUpcomingMeetings() // Initial check
    
    const interval = setInterval(checkUpcomingMeetings, 30000) // Every 30s
    
    return () => clearInterval(interval)
  }, [checkUpcomingMeetings, settings.enabled])

  const dismissNotification = useCallback(() => {
    setUpcomingNotification(null)
  }, [])

  return {
    upcomingNotification,
    dismissNotification
  }
}
