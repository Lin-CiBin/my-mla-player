// src/app/layout.tsx

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body style={{ margin: 0 }}>
        {/* children 就是你的 MusicPlayer 页面内容 */}
        {children}
      </body>
    </html>
  )
}