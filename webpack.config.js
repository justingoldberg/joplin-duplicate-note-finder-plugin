const path = require('path');

module.exports = {
  mode: 'production',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    library: 'exports',
    libraryTarget: 'commonjs',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      // Point 'api' and 'api/types' to our local stubs for TS resolution;
      // webpack will then treat them as externals (see below).
      'api/types': path.resolve(__dirname, 'api/types.d.ts'),
    },
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  // Tell webpack NOT to bundle these — Joplin injects them at runtime.
  externals: {
    api: 'api',
    'api/types': 'api/types',
  },
};
