module.exports = [
  {
    test: /\.jsx?$/,
    exclude: /(node_modules|bower_components|public\/)/,
    loader: "babel-loader"
  },
  {
    test: /\.css$/,
    loaders: ['style-loader', 'css-loader?importLoaders=1'],
    exclude: ['node_modules']
  },
  {
    test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
    exclude: /(node_modules|bower_components)/,
    loader: "file-loader"
  },
  {
    test: /\.(woff|woff2)$/,
    exclude: /(node_modules|bower_components)/,
    loader: "url-loader?prefix=font/&limit=5000"
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    exclude: /(node_modules|bower_components)/,
    loader: "url-loader?limit=10000&mimetype=application/octet-stream"
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    exclude: /(node_modules|bower_components)/,
    loader: "url-loader?limit=10000&mimetype=image/svg+xml"
  },
  {
    test: /\.gif/,
    exclude: /(node_modules|bower_components)/,
    loader: "base64-inline-loader?limit=10000000&name=[name].[ext]" //limit=10000000&
  },
  {
    test: /\.jpg/,
    exclude: /(node_modules|bower_components)/,
    loader: "base64-inline-loader?name=[name].[ext]" //limit=10000000&
  },
  {
    test: /\.png/,
    exclude: /(node_modules|bower_components)/,
    loader: "base64-inline-loader?limit=10000000&name=[name].[ext]"
  },
  // {
  //   test: /\.mp3$/,
  //   loader: 'file-loader',
  // },
  {
    test: /\.mp3$/,
    use: 'base64-inline-loader?limit=10000000&name=[name].[ext]',
  },
];
