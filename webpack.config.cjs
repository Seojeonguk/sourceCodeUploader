const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  devtool: 'source-map',
  cache: {
    type: 'filesystem',
  },
  entry: {
    content: [
      './scripts/common/exception/DuplicateResourceException.js',
      './scripts/common/exception/InvalidRequestException.js',
      './scripts/common/exception/NotFoundException.js',
      './scripts/common/exception/ParseException.js',
      './scripts/common/exception/PlatformDispatcherNotFoundException.js',
      './scripts/common/exception/UndefinedException.js',
      './scripts/common/exception/index.js',
      './scripts/common/utils/index.js',
      './scripts/programmers/index.js',
      './scripts/programmers/sourceExtractor.js',
    ],
  },
  output: {
    filename: 'bundle.js', // 각 엔트리에 대해 고유한 이름 사용
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            cacheDirectory: true,
            compact: false,
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  optimization: {
    minimize: true,
    splitChunks: false,
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    }),
  ],
};
