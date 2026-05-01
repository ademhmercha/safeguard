/**
 * Single config plugin that writes all native Android modules directly
 * into the app's source tree (no auto-linking required).
 * Modules: ForegroundService, DeviceAdmin, UsageStats
 */
const { withDangerousMod, withAndroidManifest } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// ─── Kotlin source templates ──────────────────────────────────────────────────

const PACKAGE_KT = `package com.safeguard.child.modules

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SafeGuardModulesPackage : ReactPackage {
  override fun createNativeModules(ctx: ReactApplicationContext): List<NativeModule> = listOf(
    ForegroundServiceModule(ctx),
    DeviceAdminModule(ctx),
    UsageStatsModule(ctx),
  )
  override fun createViewManagers(ctx: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
`;

const FOREGROUND_MODULE_KT = `package com.safeguard.child.modules

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ForegroundServiceModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "ForegroundService"

  @ReactMethod
  fun start(title: String, text: String, promise: Promise) {
    try {
      val intent = Intent(ctx, SafeGuardForegroundService::class.java).apply {
        action = SafeGuardForegroundService.ACTION_START
        putExtra("title", title)
        putExtra("text", text)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun stop(promise: Promise) {
    try {
      val intent = Intent(ctx, SafeGuardForegroundService::class.java).apply {
        action = SafeGuardForegroundService.ACTION_STOP
      }
      ctx.startService(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", e.message, e)
    }
  }
}
`;

const FOREGROUND_SERVICE_KT = `package com.safeguard.child.modules

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class SafeGuardForegroundService : Service() {
  companion object {
    const val ACTION_START = "ACTION_START"
    const val ACTION_STOP  = "ACTION_STOP"
    const val CHANNEL_ID   = "safeguard_monitoring"
    const val NOTIF_ID     = 1001
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> showNotification(
        intent.getStringExtra("title") ?: "SafeGuard",
        intent.getStringExtra("text")  ?: "Monitoring active"
      )
      ACTION_STOP -> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
          @Suppress("DEPRECATION") stopForeground(true)
        }
        stopSelf()
      }
    }
    return START_STICKY
  }

  private fun showNotification(title: String, text: String) {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "SafeGuard Monitoring", NotificationManager.IMPORTANCE_LOW)
          .apply { setShowBadge(false); enableVibration(false) }
      )
    }
    val pi = PendingIntent.getActivity(
      this, 0, packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val icon = resources.getIdentifier("notification_icon", "drawable", packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_menu_info_details
    startForeground(NOTIF_ID,
      NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle(title).setContentText(text)
        .setSmallIcon(icon).setOngoing(true).setAutoCancel(false)
        .setPriority(NotificationCompat.PRIORITY_LOW).setContentIntent(pi)
        .build()
    )
  }
}
`;

const DEVICE_ADMIN_MODULE_KT = `package com.safeguard.child.modules

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class DeviceAdminModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "DeviceAdmin"

  private fun admin() = ComponentName(ctx, SafeGuardAdminReceiver::class.java)
  private fun dpm()   = ctx.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  @ReactMethod fun isAdminActive(promise: Promise) {
    promise.resolve(dpm().isAdminActive(admin()))
  }

  @ReactMethod fun lockDevice(promise: Promise) {
    if (!dpm().isAdminActive(admin())) { promise.reject("NOT_ADMIN", "Device admin not active"); return }
    dpm().lockNow()
    promise.resolve(null)
  }

  @ReactMethod fun requestAdmin(promise: Promise) {
    ctx.startActivity(Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
      putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin())
      putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
        "SafeGuard needs device admin to lock the screen when your parent requires it.")
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    })
    promise.resolve(null)
  }
}
`;

const ADMIN_RECEIVER_KT = `package com.safeguard.child.modules

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent

class SafeGuardAdminReceiver : DeviceAdminReceiver() {
  override fun onEnabled(context: Context, intent: Intent) {}
  override fun onDisabled(context: Context, intent: Intent) {}
}
`;

const USAGE_STATS_MODULE_KT = `package com.safeguard.child.modules

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.*

class UsageStatsModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {
  override fun getName() = "UsageStats"

  @ReactMethod fun hasPermission(promise: Promise) {
    val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val now = System.currentTimeMillis()
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 60_000L, now)
    promise.resolve(stats != null && stats.isNotEmpty())
  }

  @ReactMethod fun requestPermission(promise: Promise) {
    ctx.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      flags = Intent.FLAG_ACTIVITY_NEW_TASK
    })
    promise.resolve(null)
  }

  @ReactMethod fun getStats(startMs: Double, endMs: Double, promise: Promise) {
    val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val pm  = ctx.packageManager
    val result = Arguments.createArray()
    usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startMs.toLong(), endMs.toLong())
      ?.filter { it.totalTimeInForeground > 0L && it.packageName != ctx.packageName }
      ?.sortedByDescending { it.totalTimeInForeground }
      ?.take(25)
      ?.forEach { stat ->
        val appName = try {
          pm.getApplicationLabel(pm.getApplicationInfo(stat.packageName, 0)).toString()
        } catch (_: Exception) { stat.packageName }
        result.pushMap(Arguments.createMap().apply {
          putString("packageName", stat.packageName)
          putString("appName", appName)
          putDouble("usageMs", stat.totalTimeInForeground.toDouble())
        })
      }
    promise.resolve(result)
  }
}
`;

const DEVICE_ADMIN_XML = `<?xml version="1.0" encoding="utf-8"?>
<device-admin>
  <uses-policies>
    <force-lock />
  </uses-policies>
</device-admin>
`;

// ─── Plugin ───────────────────────────────────────────────────────────────────

function writeKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (mod) => {
      const root = mod.modRequest.platformProjectRoot;
      const pkg  = (mod.android?.package || 'com.safeguard.child').replace(/\./g, '/');

      const modulesDir = path.join(root, `app/src/main/java/${pkg}/modules`);
      fs.mkdirSync(modulesDir, { recursive: true });

      // Write Kotlin source files
      const files = {
        'SafeGuardModulesPackage.kt': PACKAGE_KT,
        'ForegroundServiceModule.kt': FOREGROUND_MODULE_KT,
        'SafeGuardForegroundService.kt': FOREGROUND_SERVICE_KT,
        'DeviceAdminModule.kt': DEVICE_ADMIN_MODULE_KT,
        'SafeGuardAdminReceiver.kt': ADMIN_RECEIVER_KT,
        'UsageStatsModule.kt': USAGE_STATS_MODULE_KT,
      };
      for (const [name, src] of Object.entries(files)) {
        fs.writeFileSync(path.join(modulesDir, name), src);
      }

      // Write device admin XML resource
      const xmlDir = path.join(root, 'app/src/main/res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'device_admin_policies.xml'), DEVICE_ADMIN_XML);

      // Patch MainApplication.kt to register our package
      const mainAppPath = path.join(root, `app/src/main/java/${pkg}/MainApplication.kt`);
      if (fs.existsSync(mainAppPath)) {
        let src = fs.readFileSync(mainAppPath, 'utf8');
        const importLine = `import ${(mod.android?.package || 'com.safeguard.child')}.modules.SafeGuardModulesPackage`;
        if (!src.includes('SafeGuardModulesPackage')) {
          // Add import before class declaration
          src = src.replace(/^(class MainApplication)/m, `${importLine}\n\n$1`);
          // Add package registration inside getPackages apply block
          src = src.replace(
            /packages\.apply\s*\{/,
            'packages.apply {\n          add(SafeGuardModulesPackage())'
          );
          fs.writeFileSync(mainAppPath, src);
        }
      }

      return mod;
    },
  ]);
}

function addManifestEntries(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application[0];
    const appPkg = mod.android?.package || 'com.safeguard.child';

    // Permissions
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const perms = manifest['uses-permission'];
    const addPerm = (name) => {
      if (!perms.some((p) => p.$?.['android:name'] === name))
        perms.push({ $: { 'android:name': name } });
    };
    addPerm('android.permission.FOREGROUND_SERVICE_DATA_SYNC');
    addPerm('android.permission.PACKAGE_USAGE_STATS');

    // Foreground service
    if (!app.service) app.service = [];
    const svcName = `${appPkg}.modules.SafeGuardForegroundService`;
    if (!app.service.some((s) => s.$?.['android:name'] === svcName)) {
      app.service.push({
        $: {
          'android:name': svcName,
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
          'android:stopWithTask': 'false',
        },
      });
    }

    // Device admin receiver
    if (!app.receiver) app.receiver = [];
    const rcvName = `${appPkg}.modules.SafeGuardAdminReceiver`;
    if (!app.receiver.some((r) => r.$?.['android:name'] === rcvName)) {
      app.receiver.push({
        $: {
          'android:name': rcvName,
          'android:permission': 'android.permission.BIND_DEVICE_ADMIN',
          'android:exported': 'true',
        },
        'meta-data': [{ $: { 'android:name': 'android.app.device_admin', 'android:resource': '@xml/device_admin_policies' } }],
        'intent-filter': [{ action: [{ $: { 'android:name': 'android.app.action.DEVICE_ADMIN_ENABLED' } }] }],
      });
    }

    return mod;
  });
}

module.exports = function withNativeModules(config) {
  config = writeKotlinFiles(config);
  config = addManifestEntries(config);
  return config;
};
