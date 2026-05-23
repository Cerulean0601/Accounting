'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeButtons() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      display: 'flex', 
      gap: '5px', 
      zIndex: 1000,
      opacity: 0.8,
      transition: 'opacity 0.3s ease'
    }}
    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
    >
      <button 
        className="nes-btn" 
        onClick={toggleTheme}
        style={{ fontSize: '12px', padding: '4px 8px', minHeight: 'auto' }}
        title={theme === 'dark' ? '切換亮色' : '切換暗色'}
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
