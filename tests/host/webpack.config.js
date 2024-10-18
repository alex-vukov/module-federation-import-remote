const { ModuleFederationPlugin } = require("webpack").container;
const HtmlWebpackPlugin = require("html-webpack-plugin");
const path = require("path");

function createConfig() {
  return {
    entry: "./index.js",
    output: {
      path: path.resolve(__dirname, "../", "dist", "host"),
      clean: true,
    },
    optimization: {
      minimize: false,
    },
    plugins: [
      new HtmlWebpackPlugin(),
      new ModuleFederationPlugin({
        name: "host",
      }),
    ],
    target: "web",
  };
}

module.exports = createConfig();
