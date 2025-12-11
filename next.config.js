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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://auth.privy.io",
              "style-src 'self' 'unsafe-inline' https://auth.privy.io",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://auth.privy.io https://api.privy.io https://*.privy.io wss://*.privy.io",
              "frame-src 'self' https://auth.privy.io",
              "frame-ancestors 'self' https://auth.privy.io",
            ].join('; '),
          },
        ],
      },
    ]
  },

  webpack: (config, { isServer }) => {
    const { IgnorePlugin, NormalModuleReplacementPlugin } = require('webpack');

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

    // Replace the IDL require with an empty module for browser builds
    if (!isServer) {
      config.plugins.push(
        new NormalModuleReplacementPlugin(
          /target[\\/]idl[\\/]predict_duel\.json$/,
          require.resolve('./empty-module.js')
        )
      );
    }

    return config;
  },
}

module.exports = nextConfig;
