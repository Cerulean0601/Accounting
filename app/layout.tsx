import 'nes.css/css/nes.min.css'
import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  )
}
