package com.bostoncitygroup.bcgtv

import android.content.Context
import android.content.Intent

object PlayerLauncher {
    fun open(context: Context, screenNum: Int) {
        when (Prefs.getPlayerEngine(context)) {
            Prefs.ENGINE_WEB -> {
                context.startActivity(
                    Intent(context, PlayerActivity::class.java).apply {
                        putExtra(PlayerActivity.EXTRA_SCREEN_NUM, screenNum)
                    },
                )
            }
            else -> {
                context.startActivity(
                    Intent(context, NativePlayerActivity::class.java).apply {
                        putExtra(NativePlayerActivity.EXTRA_SCREEN_NUM, screenNum)
                    },
                )
            }
        }
    }
}
