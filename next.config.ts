/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 必须设置为 export 才能生成静态文件
  // 如果你的网址不是根目录（比如有项目名后缀），请解除下面两行的注释并填入项目名
  // basePath: '/your-repo-name', 
  // assetPrefix: '/your-repo-name',
  images: {
    unoptimized: true, // 静态导出必须禁用默认的图片优化
  },
};

export default nextConfig;