package com.bostoncitygroup.bcgtv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
        val num = Prefs.getScreenNum(context)
        if (num !in 1..21) return
        val launch = Intent(context, PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_SCREEN_NUM, num)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(launch)
    }
}
