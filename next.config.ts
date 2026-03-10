/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 必须
  basePath: '/my-mla-player', // 关键：匹配你的仓库名
  assetPrefix: '/my-mla-player', // 关键：确保 CSS/JS 引用路径正确
  images: {
    unoptimized: true, // 静态导出必须禁用图片优化
  },
};

export default nextConfig;