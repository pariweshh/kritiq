// Metro config — extends Expo defaults to bundle the MoveNet .tflite model asset.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow require() of the on-device pose model (react-native-fast-tflite).
config.resolver.assetExts.push("tflite");

module.exports = config;
