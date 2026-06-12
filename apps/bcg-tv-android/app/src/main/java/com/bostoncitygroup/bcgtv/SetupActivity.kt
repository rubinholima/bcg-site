package com.bostoncitygroup.bcgtv

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity

class SetupActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val saved = Prefs.getScreenNum(this)
        if (saved in 1..21 && !intent.getBooleanExtra(EXTRA_FORCE_SETUP, false)) {
            openPlayer(saved)
            finish()
            return
        }

        setContentView(R.layout.activity_setup)

        val spinner = findViewById<Spinner>(R.id.screenSpinner)
        val labels = HallScreens.all.map { it.display() }
        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)

        val preselect = if (saved in 1..21) saved - 1 else 0
        spinner.setSelection(preselect)

        findViewById<Button>(R.id.startButton).setOnClickListener {
            val num = HallScreens.all[spinner.selectedItemPosition].num
            Prefs.setScreenNum(this, num)
            openPlayer(num)
            finish()
        }
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            moveTaskToBack(true)
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun openPlayer(num: Int) {
        startActivity(
            Intent(this, PlayerActivity::class.java).apply {
                putExtra(PlayerActivity.EXTRA_SCREEN_NUM, num)
            },
        )
    }

    companion object {
        const val EXTRA_FORCE_SETUP = "force_setup"
    }
}
