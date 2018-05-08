const webpack = require('webpack');
const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = {
  devServer: {
    contentBase: path.resolve(__dirname, './src'),
    disableHostCheck: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules)/,
        loader: 'babel-loader',
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('css-loader!sass-loader'),
      },
      {
        test: /\.vue$/,
        loader: 'vue-loader',
      },
      {
        test: /\.(graphql|gql)$/,
        loader: 'graphql-tag/loader',
      },
      {
         test: /\.(png|jpg|gif)$/,
         use: [
           {
             loader: 'url-loader',
             options: {
               limit: 8192
             }
           }
         ]
      }
    ]
  },
  plugins: [
    new ExtractTextPlugin('styles.css'),
    new CopyWebpackPlugin([
      { from: './src/index.html', to: './index.html' }
    ]),
    new VueLoaderPlugin(),
  ]
};
