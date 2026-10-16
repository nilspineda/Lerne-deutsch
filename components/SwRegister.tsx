'use client'
import { useEffect } from 'react'

// registra el service worker (PWA instalable / shell offline)
export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
