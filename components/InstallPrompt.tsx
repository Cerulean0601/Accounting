'use client'

import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      console.log('用戶接受了安裝提示')
    } else {
      console.log('用戶拒絕了安裝提示')
    }
    
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  if (!showInstallPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      <div className="nes-container is-rounded bg-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-bold mb-1">安裝記帳應用</h3>
            <p className="text-xs text-gray-600">
              將應用安裝到主畫面，享受更好的使用體驗
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleInstall}
              className="nes-btn is-primary is-small"
            >
              安裝
            </button>
            <button
              onClick={handleDismiss}
              className="nes-btn is-small"
            >
              稍後
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
