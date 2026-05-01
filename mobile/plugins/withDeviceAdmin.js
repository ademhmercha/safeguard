const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const DEVICE_ADMIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin>
  <uses-policies>
    <force-lock />
  </uses-policies>
</device-admin>
`;

// Step 1: write device_admin_policies.xml into the app's res/xml directory
function withDeviceAdminXml(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const xmlDir = path.join(
        config.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'res', 'xml'
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'device_admin_policies.xml'), DEVICE_ADMIN_XML);
      return config;
    },
  ]);
}

// Step 2: declare the receiver in AndroidManifest.xml
function withDeviceAdminReceiver(config) {
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
}

module.exports = function withDeviceAdmin(config) {
  config = withDeviceAdminXml(config);
  config = withDeviceAdminReceiver(config);
  return config;
};
