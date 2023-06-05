const path = require('path');

module.exports = {
    entry: './src/index.ts',

    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                include: path.resolve(__dirname, 'src'),
                //exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        modules: [

            "node_modules"
        ]
    },
    devtool: 'source-map',
    mode: "development",


    plugins: [
    ],
    devServer: {
        port: 4000,
        liveReload: true,
        static: {
            directory: path.join(__dirname, 'dist'),
            serveIndex: true,
            watch: true
        },
    },
    output: {
        publicPath: "",
        filename: 'kasimir.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: "commonjs-module"
    },
};
