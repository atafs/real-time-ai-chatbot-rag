module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom", // For React components
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest", // Transform TypeScript files
    "^.+\\.(js|jsx)$": "babel-jest", // Transform JavaScript files (including node_modules)
  },
  transformIgnorePatterns: [
    "/node_modules/(?!axios)/", // Transform axios, ignore other node_modules
  ],
  moduleNameMapper: {
    "\\.(css|less)$": "identity-obj-proxy", // Mock CSS imports
  },
  jest: {
    preset: "ts-jest",
    testEnvironment: "jsdom",
    transform: {
      "^.+\\.(ts|tsx)$": "ts-jest",
    },
    moduleNameMapper: {
      "\\.(css|less)$": "identity-obj-proxy",
    },
  },
};
