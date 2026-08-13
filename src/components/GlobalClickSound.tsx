'use client'

import { useEffect, useRef } from 'react'

export function GlobalClickSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null
      let isButton = false

      // Bubble up to see if the click originated inside a button element
      while (target && target !== document.body) {
        if (
          target.tagName.toLowerCase() === 'button' || 
          target.getAttribute('role') === 'button'
        ) {
          isButton = true
          break
        }
        target = target.parentElement
      }

      if (isButton && audioRef.current) {
        // Clone the audio node to allow overlapping sounds on rapid clicks
        const clone = audioRef.current.cloneNode() as HTMLAudioElement
        clone.volume = 0.4 // Slightly lowered volume for button clicks to avoid being overbearing
        clone.play().catch(() => {
          // Ignore autoplay blocks, usually resolves itself on the first real user interaction
        })
      }
    }

    // Capture phase so we hear it even if a click handler stops propagation
    document.addEventListener('click', handleClick, { capture: true })
    return () => document.removeEventListener('click', handleClick, { capture: true })
  }, [])

  return <audio ref={audioRef} src="/button-press.mp3" preload="auto" className="hidden" />
}
