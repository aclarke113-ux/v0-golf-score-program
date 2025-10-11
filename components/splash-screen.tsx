"use client"

import { useEffect, useState } from "react"
import { Trophy } from "lucide-react"

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)

  useEffect(() => {
    // Show splash for 2 seconds
    const timer = setTimeout(() => {
      setFadeOut(true)
      // Wait for fade animation to complete
      setTimeout(onComplete, 500)
    }, 2000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-yellow-600 transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <Trophy className="h-24 w-24 text-white animate-bounce" />
          <div className="absolute inset-0 h-24 w-24 bg-white/20 rounded-full blur-xl animate-pulse" />
        </div>
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">Aussie Golf</h1>
          <p className="text-white/90 text-lg font-medium">Tournament Scoring System</p>
        </div>
      </div>
    </div>
  )
}
