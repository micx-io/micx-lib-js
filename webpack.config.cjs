const path = require('path');

module.exports = {
    entry: './src/index.ts',
    target: "web",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                include: path.resolve(__dirname, 'src'),
                //exclude: /node_modules/,
            },
              {
              enforce: "pre",
              test: /\.js$/,
              loader: "source-map-loader"
          },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],

    },
    devtool: 'source-map',
    mode: "development",



    plugins: [
    ],
    devServer: {
        port: 4000,

        static: {
            directory: path.join(__dirname, 'www'),
            serveIndex: true,
        },
    },
    output: {
        publicPath: "",
        filename: 'micx-lib.js',
        path: path.resolve(__dirname, 'dist')
    },
};
