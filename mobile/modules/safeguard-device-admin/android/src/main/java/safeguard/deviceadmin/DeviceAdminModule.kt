package safeguard.deviceadmin

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DeviceAdminModule : Module() {

  private fun adminComponent(context: Context) =
    ComponentName(context, SafeGuardAdminReceiver::class.java)

  private fun dpm(context: Context) =
    context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager

  override fun definition() = ModuleDefinition {
    Name("DeviceAdmin")

    AsyncFunction("isAdminActive") {
      val ctx = appContext.reactContext ?: return@AsyncFunction false
      dpm(ctx).isAdminActive(adminComponent(ctx))
    }

    AsyncFunction("lockDevice") {
      val ctx = appContext.reactContext ?: throw Exception("No context")
      val manager = dpm(ctx)
      if (!manager.isAdminActive(adminComponent(ctx))) {
        throw Exception("Device admin not active — call requestAdmin first")
      }
      manager.lockNow()
    }

    AsyncFunction("requestAdmin") {
      val ctx = appContext.reactContext ?: throw Exception("No context")
      val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent(ctx))
        putExtra(
          DevicePolicyManager.EXTRA_ADD_EXPLANATION,
          "SafeGuard needs device admin permission to lock the screen when your parent requires it."
        )
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      ctx.startActivity(intent)
    }
  }
}
