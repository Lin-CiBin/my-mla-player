/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',      // 必须：启用静态导出
  basePath: '/my-mla-player', // 必须：匹配你的仓库名
  trailingSlash: true,   // 必须：解决静态路由 404 问题
  images: {
    unoptimized: true,   // 必须：静态导出不支持图片优化
  },
};

export default nextConfig;