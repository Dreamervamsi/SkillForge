"use client"

import { useState, useEffect, useRef } from "react"

interface UseAssessmentTimerOptions {
  initialTimeLimitMinutes: number
  initialRemainingSeconds: number | null
  isActive: boolean
  onExpire: () => void
}

export function useAssessmentTimer({
  initialTimeLimitMinutes,
  initialRemainingSeconds,
  isActive,
  onExpire,
}: UseAssessmentTimerOptions) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (initialRemainingSeconds !== null && initialRemainingSeconds !== undefined) {
      return initialRemainingSeconds
    }
    return initialTimeLimitMinutes * 60
  })

  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  // Synchronize when server updates time_remaining_seconds
  useEffect(() => {
    if (initialRemainingSeconds !== null && initialRemainingSeconds !== undefined) {
      setRemainingSeconds(initialRemainingSeconds)
    }
  }, [initialRemainingSeconds])

  useEffect(() => {
    if (!isActive || remainingSeconds <= 0) return

    const intervalId = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId)
          setTimeout(() => onExpireRef.current(), 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isActive, remainingSeconds])

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const isUrgent = remainingSeconds <= 120 // less than 2 mins
  const formattedTime = formatTime(remainingSeconds)

  return {
    remainingSeconds,
    formattedTime,
    minutes,
    seconds,
    isUrgent,
    isExpired: remainingSeconds <= 0,
  }
}
