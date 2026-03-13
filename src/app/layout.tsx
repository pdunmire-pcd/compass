import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Compass',
  description: 'Your personal productivity assistant',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-compass-bg text-compass-text antialiased">
        {children}
      </body>
    </html>
  )
}
