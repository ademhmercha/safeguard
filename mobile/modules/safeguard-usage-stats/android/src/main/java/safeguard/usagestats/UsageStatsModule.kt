package safeguard.usagestats

import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UsageStatsModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("UsageStats")

    AsyncFunction("hasPermission") {
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val now = System.currentTimeMillis()
      val stats = usm.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        now - 60_000L,
        now
      )
      stats != null && stats.isNotEmpty()
    }

    AsyncFunction("requestPermission") {
      val ctx = appContext.reactContext ?: throw Exception("No context")
      ctx.startActivity(
        Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
      )
    }

    // startMs / endMs are JS timestamps (Double because JS Number → Kotlin Double)
    AsyncFunction("getStats") { startMs: Double, endMs: Double ->
      val ctx = appContext.reactContext ?: return@AsyncFunction emptyList<Map<String, Any>>()
      val usm = ctx.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
      val pm = ctx.packageManager

      val stats = usm.queryUsageStats(
        UsageStatsManager.INTERVAL_DAILY,
        startMs.toLong(),
        endMs.toLong()
      ) ?: return@AsyncFunction emptyList<Map<String, Any>>()

      stats
        .filter { it.totalTimeInForeground > 0L && it.packageName != ctx.packageName }
        .sortedByDescending { it.totalTimeInForeground }
        .take(25)
        .map { stat ->
          val appName = try {
            pm.getApplicationLabel(
              pm.getApplicationInfo(stat.packageName, 0)
            ).toString()
          } catch (_: Exception) {
            stat.packageName
          }
          mapOf(
            "packageName" to stat.packageName,
            "appName" to appName,
            "usageMs" to stat.totalTimeInForeground
          )
        }
    }
  }
}
