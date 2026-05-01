const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withDeviceAdmin(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application[0];
    if (!application.receiver) application.receiver = [];

    if (!application.receiver.some((r) => r.$?.['android:name'] === 'safeguard.deviceadmin.SafeGuardAdminReceiver')) {
      application.receiver.push({
        $: {
          'android:name': 'safeguard.deviceadmin.SafeGuardAdminReceiver',
          'android:permission': 'android.permission.BIND_DEVICE_ADMIN',
          'android:exported': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.app.device_admin',
              'android:resource': '@xml/device_admin_policies',
            },
          },
        ],
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED' } }],
          },
        ],
      });
    }

    return mod;
  });
};
