package com.bostoncitygroup.bcgtv

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity

class SetupActivity : AppCompatActivity() {
    private val engineOptions = listOf(
        Prefs.ENGINE_NDI to "NDI — ao vivo baixa latência (recomendado Hall)",
        Prefs.ENGINE_NATIVE to "Nativo — playlists e stream HTTP",
        Prefs.ENGINE_WEB to "Web — compatibilidade máxima",
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val saved = Prefs.getScreenNum(this)
        if (saved in 1..21 && !intent.getBooleanExtra(EXTRA_FORCE_SETUP, false)) {
            PlayerLauncher.open(this, saved)
            finish()
            return
        }

        setContentView(R.layout.activity_setup)

        val engineSpinner = findViewById<Spinner>(R.id.engineSpinner)
        engineSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            engineOptions.map { it.second },
        )
        val savedEngine = Prefs.getPlayerEngine(this)
        val engineIdx = engineOptions.indexOfFirst { it.first == savedEngine }.coerceAtLeast(0)
        engineSpinner.setSelection(engineIdx)

        val spinner = findViewById<Spinner>(R.id.screenSpinner)
        val labels = HallScreens.all.map { it.display() }
        spinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, labels)

        val preselect = if (saved in 1..21) saved - 1 else 0
        spinner.setSelection(preselect)

        findViewById<Button>(R.id.startButton).setOnClickListener {
            val num = HallScreens.all[spinner.selectedItemPosition].num
            Prefs.setScreenNum(this, num)
            Prefs.setPlayerEngine(this, engineOptions[engineSpinner.selectedItemPosition].first)
            PlayerLauncher.open(this, num)
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

    companion object {
        const val EXTRA_FORCE_SETUP = "force_setup"
    }
}
