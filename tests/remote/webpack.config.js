const { ModuleFederationPlugin } = require("webpack").container;
const path = require("path");

function createConfig() {
  return {
    entry: "./index.js",
    output: {
      path: path.resolve(__dirname, "../", "dist", "remote"),
      clean: true,
    },
    optimization: {
      minimize: false,
    },
    plugins: [
      new ModuleFederationPlugin({
        name: "remote",
        library: { type: "var", name: "remote" },
        exposes: ["./index"],
        filename: "remoteEntry.js",
      }),
    ],
    target: "web",
  };
}

module.exports = createConfig();
