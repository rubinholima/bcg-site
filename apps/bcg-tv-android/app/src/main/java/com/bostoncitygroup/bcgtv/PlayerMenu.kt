package com.bostoncitygroup.bcgtv

import android.app.Activity
import android.content.Intent
import android.view.View
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

object PlayerMenu {
    fun wire(activity: AppCompatActivity, buttonId: Int = R.id.menuButton) {
        activity.findViewById<Button?>(buttonId)?.setOnClickListener {
            openSetup(activity)
        }
    }

    fun openSetup(activity: Activity) {
        activity.startActivity(
            Intent(activity, SetupActivity::class.java).apply {
                putExtra(SetupActivity.EXTRA_FORCE_SETUP, true)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            },
        )
        activity.finish()
    }
}
