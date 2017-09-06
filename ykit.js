var path = require('path');
var AssetsPlugin = require('assets-webpack-plugin')
var CompressionPlugin = require('compression-webpack-plugin')
var assetsPluginInstance = new AssetsPlugin({
  filename: 'static/prd/assets.js',
  processOutput: function (assets) {
    return 'window.WEBPACK_ASSETS = ' + JSON.stringify(assets);
  }
})
var config = require('../config.json');

var compressPlugin = new CompressionPlugin({
  asset: "[path].gz[query]",
  algorithm: "gzip",
  test: /\.(js|css)$/,
  threshold: 10240,
  minRatio: 0.8,
});

function fileExist (filePath){
  try {
      return fs.statSync(filePath).isFile();
  } catch (err) {
      return false;
  }
};

function initPlugins(){
  if(config.plugins && Array.isArray(config.plugins)){
    config.plugins = config.plugins.filter(item=>{
      return fileExist(path.resolve(__dirname, 'node_modules/yapi-plugin-' + item + '/client.js'))
    })
  }
}

initPlugins();


function handleCommonsChunk(webpackConfig) {
  var commonsChunk = {
    vendors: {
      lib: ['react', 'redux',
        'redux-thunk',
        'react-dom',
        'redux-promise',
        'react-router',
        'react-router-dom',
        'prop-types',
        'axios',
        'moment'

      ],
      lib2: [        
        'brace',
        'mockjs',
        'json5'
      ]
    }
  },
    chunks = [],
    filenameTpl = webpackConfig.output[this.env],
    vendors;



  if (typeof commonsChunk === 'object' && commonsChunk !== undefined) {
    if (typeof commonsChunk.name === 'string' && commonsChunk) {
      chunks.push(commonsChunk.name);
    }
    vendors = commonsChunk.vendors;
    if (typeof vendors === 'object' && vendors !== undefined) {
      var i = 0;
      for (var name in vendors) {
        if (vendors.hasOwnProperty(name) && vendors[name]) {
          i++;
          chunks.push(name);
          webpackConfig.entry[name] = Array.isArray(vendors[name]) ? vendors[name] : [vendors[name]];
        }
      }
      if (i > 0) {
        chunks.push('manifest');
      }

    }

    if (chunks.length > 0) {
      let chunkFilename = filenameTpl.filename
      chunkFilename = chunkFilename.replace("[ext]", '.js')
      webpackConfig.plugins.push(
        new this.webpack.optimize.CommonsChunkPlugin({
          name: chunks,
          filename: chunkFilename,
          minChunks: commonsChunk.minChunks ? commonsChunk.minChunks : 2
        })
      );

    }
  }
}


module.exports = {
  plugins: [{
    name: 'antd',
    options: {
      modifyQuery: function (defaultQuery) { // 可查看和编辑 defaultQuery
        defaultQuery.plugins = [];
        defaultQuery.plugins.push(["transform-runtime", {
          "polyfill": false,
          "regenerator": true
        }]);
        defaultQuery.plugins.push('transform-decorators-legacy');
        defaultQuery.plugins.push(["import", { libraryName: "antd"}])
        return defaultQuery;
      },
      exclude: /node_modules/
    }
  }],
  // devtool:  'cheap-source-map',
  config: function (ykit) {
    return {
      exports: [
        './index.js'
      ],
      modifyWebpackConfig: function (baseConfig) {       

        var ENV_PARAMS = {};
        switch (this.env) {
          case 'local':
            ENV_PARAMS = 'dev';
            break;
          case 'dev':
            ENV_PARAMS = 'dev';
            break;
          case 'prd':
            ENV_PARAMS = 'production';
            break;
          default:
        }

        baseConfig.plugins.push(new this.webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(ENV_PARAMS),
          'process.env.config': JSON.stringify(config)
        }))

        //初始化配置
        baseConfig.devtool = 'cheap-module-eval-source-map'
        baseConfig.context = path.resolve(__dirname, './client');
        baseConfig.resolve.alias.common = '/common';
        baseConfig.resolve.alias.plugins = '/plugins';
        baseConfig.output.prd.path = 'static/prd';
        baseConfig.output.prd.publicPath = '';
        baseConfig.output.prd.filename = '[name]@[chunkhash][ext]'

        //commonsChunk
        handleCommonsChunk.call(this, baseConfig)
        baseConfig.module.loaders.push({
          test: /\.less$/,
          loader: ykit.ExtractTextPlugin.extract(
            require.resolve('style-loader'),
            require.resolve('css-loader')
            + '?sourceMap!'
            + require.resolve('less-loader') + '?sourceMap'
          )
        })
        baseConfig.module.loaders.push({
          test: /\.(sass|scss)$/,
          loader: ykit.ExtractTextPlugin.extract(
            require.resolve('css-loader')
            + '?sourceMap!'
            + require.resolve('fast-sass-loader') + '?sourceMap'
          )
        })
        baseConfig.module.preLoaders.push({
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          loader: "eslint-loader"
        });

        if (this.env == 'prd') {
          baseConfig.plugins.push(assetsPluginInstance)
          baseConfig.plugins.push(compressPlugin)

        }
        return baseConfig;
      }
    }
  },
  server: {
    // true/false，默认 false，效果相当于 ykit server --hot
    hot: true,
    // true/false，默认 false，开启后可在当前打开的页面提示打包错误
    overlay: false
  },
  hooks: {},
  commands: []
};