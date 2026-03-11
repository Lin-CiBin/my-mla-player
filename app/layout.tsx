// src/app/layout.tsx
import './globals.css'; // 必须引入
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body className="m-0 p-0">
        {/* children 就是你的 MusicPlayer 页面内容 */}
        {children}
      </body>
    </html>
  )
}