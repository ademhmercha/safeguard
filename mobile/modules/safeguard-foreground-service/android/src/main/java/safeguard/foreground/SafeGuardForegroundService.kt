package safeguard.foreground

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
    const val ACTION_STOP = "ACTION_STOP"
    const val CHANNEL_ID = "safeguard_monitoring"
    const val NOTIFICATION_ID = 1001
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        val title = intent.getStringExtra("title") ?: "SafeGuard"
        val text = intent.getStringExtra("text") ?: "Monitoring active"
        showForegroundNotification(title, text)
      }
      ACTION_STOP -> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
          @Suppress("DEPRECATION")
          stopForeground(true)
        }
        stopSelf()
      }
    }
    return START_STICKY
  }

  private fun showForegroundNotification(title: String, text: String) {
    val manager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "SafeGuard Monitoring",
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        setShowBadge(false)
        enableVibration(false)
      }
      manager.createNotificationChannel(channel)
    }

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this, 0, launchIntent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )

    val iconResId = resources.getIdentifier("notification_icon", "drawable", packageName)
      .takeIf { it != 0 } ?: android.R.drawable.ic_menu_info_details

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(text)
      .setSmallIcon(iconResId)
      .setOngoing(true)
      .setAutoCancel(false)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setContentIntent(pendingIntent)
      .build()

    startForeground(NOTIFICATION_ID, notification)
  }
}
