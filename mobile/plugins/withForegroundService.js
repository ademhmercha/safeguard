const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withForegroundService(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;

    // FOREGROUND_SERVICE_DATA_SYNC required for Android 14+
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const perms = manifest['uses-permission'];
    if (!perms.some((p) => p.$?.['android:name'] === 'android.permission.FOREGROUND_SERVICE_DATA_SYNC')) {
      perms.push({ $: { 'android:name': 'android.permission.FOREGROUND_SERVICE_DATA_SYNC' } });
    }

    const application = manifest.application[0];
    if (!application.service) application.service = [];
    if (!application.service.some((s) => s.$?.['android:name'] === 'safeguard.foreground.SafeGuardForegroundService')) {
      application.service.push({
        $: {
          'android:name': 'safeguard.foreground.SafeGuardForegroundService',
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
          'android:stopWithTask': 'false',
        },
      });
    }

    return mod;
  });
};
