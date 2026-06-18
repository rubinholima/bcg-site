package com.bostoncitygroup.bcgtv

import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.widget.AdapterView
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import java.util.concurrent.Executors

class SetupActivity : AppCompatActivity() {
    private val io = Executors.newSingleThreadExecutor()

    private val engineOptions = listOf(
        Prefs.ENGINE_NATIVE to "Nativo — playlist + NDI (recomendado)",
        Prefs.ENGINE_NDI to "NDI — fonte manual na rede",
        Prefs.ENGINE_WEB to "Web — compatibilidade máxima",
    )

    private lateinit var syncModeGroup: RadioGroup
    private lateinit var syncFollowHall: RadioButton
    private lateinit var syncIndependent: RadioButton
    private lateinit var hallChannelHint: TextView
    private lateinit var playlistSpinner: Spinner
    private lateinit var setupStatusText: TextView
    private lateinit var startButton: Button
    private lateinit var engineSpinner: Spinner

    private lateinit var ndiSection: LinearLayout
    private lateinit var ndiFromPlaylist: RadioButton
    private lateinit var ndiFromNetwork: RadioButton
    private lateinit var ndiSourceModeGroup: RadioGroup
    private lateinit var ndiSearchButton: Button
    private lateinit var ndiDiscoveryStatus: TextView
    private lateinit var ndiSourceSpinner: Spinner

    private var playlistsData: HallPlaylistsResponse? = null
    private var loadingPlaylists = false
    private var ndiSources: List<String> = emptyList()
    private var ndiSearching = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val saved = Prefs.getScreenNum(this)
        if (saved in 1..21 && !intent.getBooleanExtra(EXTRA_FORCE_SETUP, false)) {
            PlayerLauncher.open(this, saved)
            finish()
            return
        }

        setContentView(R.layout.activity_setup)

        syncModeGroup = findViewById(R.id.syncModeGroup)
        syncFollowHall = findViewById(R.id.syncFollowHall)
        syncIndependent = findViewById(R.id.syncIndependent)
        hallChannelHint = findViewById(R.id.hallChannelHint)
        playlistSpinner = findViewById(R.id.playlistSpinner)
        setupStatusText = findViewById(R.id.setupStatusText)
        startButton = findViewById(R.id.startButton)

        ndiSection = findViewById(R.id.ndiSection)
        ndiFromPlaylist = findViewById(R.id.ndiFromPlaylist)
        ndiFromNetwork = findViewById(R.id.ndiFromNetwork)
        ndiSourceModeGroup = findViewById(R.id.ndiSourceModeGroup)
        ndiSearchButton = findViewById(R.id.ndiSearchButton)
        ndiDiscoveryStatus = findViewById(R.id.ndiDiscoveryStatus)
        ndiSourceSpinner = findViewById(R.id.ndiSourceSpinner)

        engineSpinner = findViewById(R.id.engineSpinner)
        engineSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            engineOptions.map { it.second },
        )
        val savedEngine = Prefs.getPlayerEngine(this)
        val engineIdx = engineOptions.indexOfFirst { it.first == savedEngine }.coerceAtLeast(0)
        engineSpinner.setSelection(engineIdx)
        engineSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                updateNdiUi()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
        }

        val screenSpinner = findViewById<Spinner>(R.id.screenSpinner)
        val labels = HallScreens.all.map { it.display() }
        screenSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            labels,
        )
        val preselect = if (saved in 1..21) saved - 1 else 0
        screenSpinner.setSelection(preselect)

        if (Prefs.getHallSyncMode(this) == Prefs.SYNC_INDEPENDENT) {
            syncIndependent.isChecked = true
        } else {
            syncFollowHall.isChecked = true
        }

        if (Prefs.getNdiSourceMode(this) == Prefs.NDI_SOURCE_MANUAL) {
            ndiFromNetwork.isChecked = true
        } else {
            ndiFromPlaylist.isChecked = true
        }

        syncModeGroup.setOnCheckedChangeListener { _, _ -> updatePlaylistUi() }
        ndiSourceModeGroup.setOnCheckedChangeListener { _, _ -> updateNdiUi() }

        ndiSearchButton.setOnClickListener { searchNdiSources() }

        startButton.setOnClickListener {
            val num = HallScreens.all[screenSpinner.selectedItemPosition].num
            val engine = engineOptions[engineSpinner.selectedItemPosition].first
            val syncMode = if (syncIndependent.isChecked) {
                Prefs.SYNC_INDEPENDENT
            } else {
                Prefs.SYNC_FOLLOW_HALL
            }
            val playlistId = if (syncMode == Prefs.SYNC_INDEPENDENT) {
                playlistsData?.playlists?.getOrNull(playlistSpinner.selectedItemPosition)?.id
            } else {
                null
            }

            if (syncMode == Prefs.SYNC_INDEPENDENT && playlistId.isNullOrBlank()) {
                showStatus(getString(R.string.setup_pick_playlist), true)
                return@setOnClickListener
            }

            if (engine == Prefs.ENGINE_NDI && ndiFromNetwork.isChecked) {
                val ndiName = ndiSources.getOrNull(ndiSourceSpinner.selectedItemPosition)
                if (ndiName.isNullOrBlank()) {
                    showStatus(getString(R.string.setup_ndi_pick), true)
                    return@setOnClickListener
                }
                Prefs.setNdiSourceMode(this, Prefs.NDI_SOURCE_MANUAL)
                Prefs.setNdiSourceName(this, ndiName)
            } else if (engine == Prefs.ENGINE_NDI) {
                Prefs.setNdiSourceMode(this, Prefs.NDI_SOURCE_PLAYLIST)
                Prefs.setNdiSourceName(this, null)
            }

            startButton.isEnabled = false
            showStatus(getString(R.string.setup_saving), false)

            io.execute {
                val ok = PlayerApi.bindScreenPlaylist(num, syncMode, playlistId)
                runOnUiThread {
                    if (!ok) {
                        startButton.isEnabled = true
                        showStatus(getString(R.string.setup_save_error), true)
                        return@runOnUiThread
                    }
                    Prefs.setScreenNum(this, num)
                    Prefs.setPlayerEngine(this, engine)
                    Prefs.setHallSyncMode(this, syncMode)
                    Prefs.setPlaylistId(this, playlistId)
                    PlayerLauncher.open(this, num)
                    finish()
                }
            }
        }

        loadPlaylists()
        updateNdiUi()

        val savedNdi = Prefs.getNdiSourceName(this)
        if (savedNdi != null && Prefs.getNdiSourceMode(this) == Prefs.NDI_SOURCE_MANUAL) {
            ndiSources = listOf(savedNdi)
            bindNdiSources(savedNdi)
        }
    }

    private fun currentEngine(): String =
        engineOptions.getOrNull(engineSpinner.selectedItemPosition)?.first ?: Prefs.ENGINE_NATIVE

    private fun updateNdiUi() {
        val ndiEngine = currentEngine() == Prefs.ENGINE_NDI
        ndiSection.visibility = if (ndiEngine) View.VISIBLE else View.GONE
        if (!ndiEngine) return

        val manual = ndiFromNetwork.isChecked
        ndiSearchButton.visibility = if (manual) View.VISIBLE else View.GONE
        ndiDiscoveryStatus.visibility = if (manual && ndiDiscoveryStatus.text.isNotEmpty()) {
            View.VISIBLE
        } else if (manual && ndiSearching) {
            View.VISIBLE
        } else {
            View.GONE
        }
        ndiSourceSpinner.visibility = if (manual && ndiSources.isNotEmpty()) View.VISIBLE else View.GONE
    }

    private fun searchNdiSources() {
        if (ndiSearching) return
        if (!NdiReceiverBridge.isAvailable) {
            ndiDiscoveryStatus.visibility = View.VISIBLE
            ndiDiscoveryStatus.text = getString(R.string.setup_ndi_unavailable)
            return
        }

        ndiSearching = true
        ndiSearchButton.isEnabled = false
        ndiDiscoveryStatus.visibility = View.VISIBLE
        ndiDiscoveryStatus.text = getString(R.string.setup_ndi_searching)
        ndiSourceSpinner.visibility = View.GONE

        io.execute {
            val found = NdiReceiverBridge.discoverSources(this, 10_000)
            runOnUiThread {
                ndiSearching = false
                ndiSearchButton.isEnabled = true
                ndiSources = found

                if (found.isEmpty()) {
                    ndiDiscoveryStatus.text = getString(R.string.setup_ndi_none)
                    ndiSourceSpinner.visibility = View.GONE
                } else {
                    ndiDiscoveryStatus.text = getString(R.string.setup_ndi_found, found.size)
                    bindNdiSources(Prefs.getNdiSourceName(this))
                }
                updateNdiUi()
            }
        }
    }

    private fun bindNdiSources(preselectName: String?) {
        ndiSourceSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            ndiSources,
        )
        val idx = ndiSources.indexOfFirst { it == preselectName }.coerceAtLeast(0)
        ndiSourceSpinner.setSelection(idx)
        ndiSourceSpinner.visibility = View.VISIBLE
    }

    private fun loadPlaylists() {
        if (loadingPlaylists) return
        loadingPlaylists = true
        hallChannelHint.text = getString(R.string.setup_loading_playlists)

        io.execute {
            val data = PlayerApi.fetchHallPlaylists()
            runOnUiThread {
                loadingPlaylists = false
                playlistsData = data
                if (data == null) {
                    hallChannelHint.text = getString(R.string.setup_playlists_error)
                    return@runOnUiThread
                }

                val hall = data.hallChannel
                hallChannelHint.text = if (hall.configured && !hall.playlistName.isNullOrBlank()) {
                    getString(
                        R.string.setup_hall_channel_hint,
                        hall.playlistName,
                        hall.itemCount,
                    )
                } else {
                    getString(R.string.setup_hall_not_configured)
                }

                if (data.playlists.isNotEmpty()) {
                    playlistSpinner.adapter = ArrayAdapter(
                        this,
                        android.R.layout.simple_spinner_dropdown_item,
                        data.playlists.map { it.display() },
                    )
                    val savedId = Prefs.getPlaylistId(this)
                    val idx = data.playlists.indexOfFirst { it.id == savedId }.coerceAtLeast(0)
                    playlistSpinner.setSelection(idx)
                }

                updatePlaylistUi()
            }
        }
    }

    private fun updatePlaylistUi() {
        val independent = syncIndependent.isChecked
        val hasPlaylists = !playlistsData?.playlists.isNullOrEmpty()

        playlistSpinner.visibility = if (independent && hasPlaylists) View.VISIBLE else View.GONE
        playlistSpinner.isEnabled = independent && hasPlaylists

        if (independent && !hasPlaylists) {
            hallChannelHint.text = getString(R.string.setup_no_playlists)
        } else if (!independent) {
            val hall = playlistsData?.hallChannel
            hallChannelHint.text = if (hall?.configured == true && !hall.playlistName.isNullOrBlank()) {
                getString(R.string.setup_hall_channel_hint, hall.playlistName, hall.itemCount)
            } else {
                getString(R.string.setup_hall_not_configured)
            }
        }
    }

    private fun showStatus(msg: String, isError: Boolean) {
        setupStatusText.visibility = View.VISIBLE
        setupStatusText.text = msg
        setupStatusText.setTextColor(
            if (isError) 0xFFFCA5A5.toInt() else 0xFF71717A.toInt(),
        )
    }

    override fun onDestroy() {
        io.shutdownNow()
        super.onDestroy()
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
