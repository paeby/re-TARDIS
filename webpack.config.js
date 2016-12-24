module.exports = {
  entry: './dist/map.js',
  output: {
    filename: 'bundle.js',
    path: 'dist/'
  },
  resolve: {
    extensions: ['', '.webpack.js', '.ts', '.js']
  },
  module: {
    loaders: [
      { test: /\.tsx?$/, loader: 'awesome-typescript-loader' }
    ]
  }
}