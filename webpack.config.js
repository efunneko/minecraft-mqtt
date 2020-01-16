const path          = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: "node",
  node: {
    __dirname: false
  },
  entry: {
    app: ["./src/main.js"]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "gen-release-notes.js"
  },
  devtool: 'inline-source-map',
  externals: [nodeExternals()],
};

