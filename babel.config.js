module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],   // ✅ Expo preset instead of metro
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
        },
      ],
      'expo-router/babel',  // ✅ required for expo-router
    ],
  };
};
