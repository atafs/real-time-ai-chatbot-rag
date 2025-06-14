const path = require("path");

module.exports = {
  mode: "development", // Fixes mode warning
  entry: "./src/index.tsx", // Points to index.tsx
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"], // Support TypeScript and JavaScript
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader", // Compile TypeScript
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"], // Handle CSS
      },
    ],
  },
  devServer: {
    port: 3001, // Runs on port 3001
    client: { overlay: false }, // Disables overlay for Cypress
    static: path.join(__dirname, "public"), // Serve public folder
    hot: true,
  },
};
