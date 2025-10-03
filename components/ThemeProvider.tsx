'use client'

import { useEffect, useState, createContext, useContext } from 'react'

const ThemeContext = createContext<{
  theme: string
  toggleTheme: () => void
  setLightTheme: () => void
  setDarkTheme: () => void
}>({
  theme: 'auto',
  toggleTheme: () => {},
  setLightTheme: () => {},
  setDarkTheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState('auto')

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'auto'
    setTheme(saved)
    updateDOM(saved)
  }, [])

  const updateDOM = (newTheme: string) => {
    if (newTheme === 'auto') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    updateDOM(newTheme)
  }

  const setLightTheme = () => {
    setTheme('light')
    localStorage.setItem('theme', 'light')
    updateDOM('light')
  }

  const setDarkTheme = () => {
    setTheme('dark')
    localStorage.setItem('theme', 'dark')
    updateDOM('dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setLightTheme, setDarkTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
