module.exports = {
  reactStrictMode: true,
  webpack(config) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false
    };
    config.experiments = { asyncWebAssembly: true, layers: true };

    return config;
  }
};
