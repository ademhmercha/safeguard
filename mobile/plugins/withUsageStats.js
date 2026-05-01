const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withUsageStats(config) {
  return withAndroidManifest(config, (mod) => {
    const perms = mod.modResults.manifest['uses-permission'] || [];
    mod.modResults.manifest['uses-permission'] = perms;

    if (!perms.some((p) => p.$?.['android:name'] === 'android.permission.PACKAGE_USAGE_STATS')) {
      perms.push({ $: { 'android:name': 'android.permission.PACKAGE_USAGE_STATS' } });
    }

    return mod;
  });
};
