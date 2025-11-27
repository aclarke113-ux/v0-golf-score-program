"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

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
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1a3a2e] transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <Image
          src="/aussie-slice-logo.png"
          alt="Aussie Slice"
          width={200}
          height={200}
          className="animate-pulse"
          priority
        />
      </div>
    </div>
  )
}
