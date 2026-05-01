package safeguard.foreground

import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ForegroundServiceModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ForegroundService")

    AsyncFunction("start") { title: String, text: String ->
      val context = appContext.reactContext ?: throw Exception("No React context")
      val intent = Intent(context, SafeGuardForegroundService::class.java).apply {
        action = SafeGuardForegroundService.ACTION_START
        putExtra("title", title)
        putExtra("text", text)
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(intent)
      } else {
        context.startService(intent)
      }
    }

    AsyncFunction("stop") {
      val context = appContext.reactContext ?: return@AsyncFunction
      val intent = Intent(context, SafeGuardForegroundService::class.java).apply {
        action = SafeGuardForegroundService.ACTION_STOP
      }
      context.startService(intent)
    }
  }
}
