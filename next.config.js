/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    const { IgnorePlugin, NormalModuleReplacementPlugin } = require('webpack');
    
    // Ignore thread-stream test files
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^\.\/test/,
        contextRegExp: /node_modules[\\/]thread-stream/,
      })
    );
    
    // Ignore all test directories and test files in node_modules
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

module.exports = nextConfig

