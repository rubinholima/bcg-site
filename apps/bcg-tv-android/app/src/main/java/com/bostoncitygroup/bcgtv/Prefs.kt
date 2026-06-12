package com.bostoncitygroup.bcgtv

import android.content.Context

object Prefs {
    private const val NAME = "bcgtv_prefs"
    private const val KEY_SCREEN = "screen_num"

    fun getScreenNum(context: Context): Int =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getInt(KEY_SCREEN, 0)

    fun setScreenNum(context: Context, num: Int) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_SCREEN, num)
            .apply()
    }

    fun clearScreenNum(context: Context) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_SCREEN)
            .apply()
    }
}
