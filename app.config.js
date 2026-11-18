module.exports = ({ config }) => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;
  const androidPackage = process.env.BIOOLEO_ANDROID_PACKAGE;
  return {
    ...config,
    android: { ...config.android, ...(androidPackage ? { package: androidPackage } : {}) },
    plugins: [
      ...(config.plugins ?? []),
      ...(androidGoogleMapsApiKey ? [["react-native-maps", { androidGoogleMapsApiKey }]] : []),
    ],
  };
};
