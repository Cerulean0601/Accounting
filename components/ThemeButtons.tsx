'use client'

import { useTheme } from './ThemeProvider'

export default function ThemeButtons() {
  const { theme, toggleTheme, setLightTheme, setDarkTheme } = useTheme()

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', display: 'flex', gap: '10px', zIndex: 1000 }}>
      <button className="nes-btn is-primary" onClick={setLightTheme}>
        ☀️
      </button>
      <button className="nes-btn is-dark" onClick={setDarkTheme}>
        🌙
      </button>
      <button className="nes-btn" onClick={toggleTheme}>
        🔄
      </button>
    </div>
  )
}
