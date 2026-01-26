/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io https://*.privy.io",
              "style-src 'self' 'unsafe-inline' https://auth.privy.io https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' http://localhost:* ws://localhost:* https://auth.privy.io https://api.privy.io https://*.privy.io wss://*.privy.io https://mainnet.rpc.privy.systems https://*.rpc.privy.systems https://api.devnet.solana.com https://api.mainnet-beta.solana.com https://api.testnet.solana.com https://*.solana.com wss://*.solana.com https://rpc.ankr.com https://*.ankr.com https://explorer-api.walletconnect.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://api.binance.com",
              "frame-src 'self' https://auth.privy.io",
              "frame-ancestors 'self' https://auth.privy.io",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    const { IgnorePlugin } = require('webpack');

    // Ignore thread-stream test files
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^\.\/test/,
        contextRegExp: /node_modules[\\/]thread-stream/,
      })
    );

    // Ignore all test/test-like directories in node_modules
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /[\\/](test|tests|__tests__|spec)[\\/]/,
        contextRegExp: /node_modules/,
      })
    );

    // Ignore test files by extension in node_modules
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /\.(test|spec)\.(js|ts|mjs)$/,
        contextRegExp: /node_modules/,
      })
    );

    // Ignore solana-program test files
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /solana-program[\\/]tests/,
      })
    );

    // Ignore solana-program example files
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /solana-program[\\/]client[\\/]example-integration\.ts$/,
      })
    );

    // Add webpack fallbacks for Node.js modules (for browser compatibility)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    return config;
  },
}

module.exports = nextConfig;
