import 'nes.css/css/nes.min.css'
import './globals.css'
import ThemeProvider from '../components/ThemeProvider'
import localFont from 'next/font/local'

const fusionPixel = localFont({
  src: '/fonts/fusion-pixel-10px-monospaced-zh_hans.otf',
  variable: '--font-fusion-pixel'
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className={fusionPixel.variable}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
