'use client'

import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineMessage, setShowOfflineMessage] = useState(false)

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      
      if (!online) {
        setShowOfflineMessage(true)
      } else if (showOfflineMessage) {
        // 顯示重新連線訊息
        setTimeout(() => setShowOfflineMessage(false), 3000)
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // 初始狀態檢查
    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [showOfflineMessage])

  if (!showOfflineMessage) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className={`nes-container is-rounded ${isOnline ? 'is-success' : 'is-warning'}`}>
        <div className="flex items-center">
          <i className={`nes-icon ${isOnline ? 'is-medium heart' : 'is-medium star'}`}></i>
          <div className="ml-3">
            <p className="text-sm font-bold">
              {isOnline ? '已重新連線' : '離線模式'}
            </p>
            <p className="text-xs">
              {isOnline 
                ? '網路連線已恢復，資料將自動同步' 
                : '目前處於離線狀態，資料將在連線後同步'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
