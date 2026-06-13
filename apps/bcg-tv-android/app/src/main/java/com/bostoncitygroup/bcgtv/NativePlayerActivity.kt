package com.bostoncitygroup.bcgtv

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.nsd.NsdManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.load
import java.util.concurrent.Executors

/**
 * Player nativo — ExoPlayer com buffer reduzido (menor latência que WebView).
 * YouTube: abre PlayerActivity (web) — funciona com Referer do site, sem erro 153.
 */
class NativePlayerActivity : AppCompatActivity() {
    private lateinit var playerView: PlayerView
    private lateinit var imageView: ImageView
    private lateinit var ndiSurfaceView: SurfaceView
    private lateinit var ndiPlaceholder: TextView
    private lateinit var statusText: TextView

    private var exoPlayer: ExoPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()

    private var screenNum = 0
    private var playerToken: String? = null
    private var payload: PlayerPayload? = null
    private var currentKey: String? = null
    private var currentNdiSource: String? = null
    private var ndiSurfaceReady = false
    private var ndiConnectInFlight = false
    private var ndiInitialized = false
    private var nsdManager: NsdManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_native_player)

        screenNum = intent.getIntExtra(EXTRA_SCREEN_NUM, Prefs.getScreenNum(this))
        if (screenNum !in 1..21) {
            startActivity(Intent(this, SetupActivity::class.java))
            finish()
            return
        }

        playerView = findViewById(R.id.exoPlayerView)
        imageView = findViewById(R.id.imageView)
        ndiSurfaceView = findViewById(R.id.ndiSurfaceView)
        ndiPlaceholder = findViewById(R.id.ndiPlaceholder)
        statusText = findViewById(R.id.statusText)

        PlayerMenu.wire(this)

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(500, 2000, 500, 500)
            .build()
        exoPlayer = ExoPlayer.Builder(this)
            .setLoadControl(loadControl)
            .build()
            .also { player ->
                playerView.player = player
                player.playWhenReady = true
            }

        statusText.visibility = View.VISIBLE
        statusText.text = "BCG TV nativo · tela $screenNum"
        bootstrap()
    }

    private fun bootstrap() {
        io.execute {
            val token = PlayerApi.fetchPlayerToken(screenNum)
            handler.post {
                if (token == null) {
                    statusText.text = "Erro ao obter token. Tentando…"
                    handler.postDelayed({ bootstrap() }, 8000)
                    return@post
                }
                playerToken = token
                startLoops()
            }
        }
    }

    private fun startLoops() {
        handler.post(refreshRunnable)
        handler.post(tickRunnable)
    }

    private val refreshRunnable = object : Runnable {
        override fun run() {
            val token = playerToken ?: return
            io.execute {
                val next = PlayerApi.fetchPayload(token)
                handler.post {
                    payload = next
                    renderCurrent()
                    handler.postDelayed(this, 5000)
                }
            }
        }
    }

    private val tickRunnable = object : Runnable {
        override fun run() {
            renderCurrent()
            handler.postDelayed(this, 400)
        }
    }

    private fun renderCurrent() {
        val data = payload
        if (data == null || data.items.isEmpty()) {
            statusText.text = "Aguardando playlist…"
            return
        }

        val items = data.items
        val hall = data.hallSync
        val (idx, offsetMs) = if (hall != null) {
            val syncItems = items.map { HallSyncItem(it.contentType, it.durationSeconds) }
            HallSyncMath.extrapolate(hall, syncItems, System.currentTimeMillis())
        } else {
            0 to 0L
        }

        val item = items[idx % items.size]
        val key = "${item.id}-${hall?.playlistVersion ?: 0}-$idx"
        if (key == currentKey) {
            if (item.contentType == "video_url" && hall != null && !hall.paused) {
                seekIfNeeded(offsetMs)
            }
            return
        }
        currentKey = key
        showItem(item, offsetMs, hall?.paused == true)
    }

    private fun showItem(item: PlayerItem, offsetMs: Long, paused: Boolean) {
        hideAll()
        when (item.contentType) {
            "image_url" -> {
                imageView.visibility = View.VISIBLE
                imageView.load(item.url)
            }
            "video_url" -> playStream(item.url, offsetMs, paused)
            "iptv_stream", "vmix_stream" -> playStream(resolveStreamUrl(item.url), 0, paused)
            "ndi_stream" -> showNdi(item)
            "youtube_video" -> {
                startActivity(
                    Intent(this, PlayerActivity::class.java).apply {
                        putExtra(PlayerActivity.EXTRA_SCREEN_NUM, screenNum)
                    },
                )
                finish()
            }
            else -> {
                statusText.text = "Tipo não suportado: ${item.contentType}"
                statusText.visibility = View.VISIBLE
            }
        }
    }

    private fun resolveNdiSourceName(item: PlayerItem): String {
        if (Prefs.getNdiSourceMode(this) == Prefs.NDI_SOURCE_MANUAL) {
            val manual = Prefs.getNdiSourceName(this)?.trim().orEmpty()
            if (manual.isNotEmpty()) return manual
        }
        return item.url.trim()
    }

    private fun ensureNdiReady() {
        if (ndiInitialized) return
        ndiInitialized = true
        NdiAndroidBootstrap.ensure(this)
        nsdManager = getSystemService(Context.NSD_SERVICE) as NsdManager
        NdiReceiverBridge.attachSurface(ndiSurfaceView) {
            ndiSurfaceReady = true
            currentNdiSource?.let { tryConnectNdi(it) }
        }
    }

    private fun showNdi(item: PlayerItem) {
        ensureNdiReady()
        val sourceName = resolveNdiSourceName(item)
        if (sourceName.isEmpty()) {
            ndiPlaceholder.text = "Fonte NDI sem nome configurado."
            ndiPlaceholder.visibility = View.VISIBLE
            return
        }

        ndiSurfaceView.visibility = View.VISIBLE
        ndiPlaceholder.visibility = View.VISIBLE
        ndiPlaceholder.text = "Iniciando NDI: $sourceName…"
        currentNdiSource = sourceName

        if (ndiSurfaceReady) {
            tryConnectNdi(sourceName)
        }

        handler.removeCallbacks(ndiStatusRunnable)
        handler.removeCallbacks(ndiRetryRunnable)
        handler.postDelayed(ndiStatusRunnable, 500)
        handler.postDelayed(ndiRetryRunnable, 20_000)
    }

    private fun tryConnectNdi(sourceName: String) {
        if (ndiConnectInFlight || isFinishing) return
        NdiAndroidBootstrap.ensure(this)
        if (!NdiReceiverBridge.isAvailable) {
            ndiPlaceholder.text =
                "NDI: ${NdiReceiverBridge.status()}\n\n" +
                    "libndi.so ausente no APK.\nRebuild com setup-ndi-sdk.ps1."
            ndiPlaceholder.visibility = View.VISIBLE
            return
        }
        ndiConnectInFlight = true
        NdiReceiverBridge.connect(sourceName) { ok ->
            ndiConnectInFlight = false
            handler.post {
                if (isFinishing) return@post
                if (!ok) {
                    ndiPlaceholder.text =
                        "NDI: ${NdiReceiverBridge.status()}\n\n" +
                            "Fonte: $sourceName\n\n" +
                            "App continua tentando automaticamente."
                    ndiPlaceholder.visibility = View.VISIBLE
                }
            }
        }
    }

    private val ndiStatusRunnable = object : Runnable {
        override fun run() {
            if (currentNdiSource == null || ndiSurfaceView.visibility != View.VISIBLE || isFinishing) return
            val st = NdiReceiverBridge.status()
            if (st.startsWith("Conectado")) {
                ndiPlaceholder.visibility = View.GONE
                statusText.text = "NDI · $currentNdiSource"
                statusText.visibility = View.VISIBLE
            } else {
                ndiPlaceholder.text = st
                ndiPlaceholder.visibility = View.VISIBLE
            }
            handler.postDelayed(this, 1000)
        }
    }

    private val ndiRetryRunnable = object : Runnable {
        override fun run() {
            if (currentNdiSource == null || ndiSurfaceView.visibility != View.VISIBLE || isFinishing) return
            val st = NdiReceiverBridge.status()
            if (!st.startsWith("Conectado") && !ndiConnectInFlight) {
                tryConnectNdi(currentNdiSource!!)
            }
            handler.postDelayed(this, 20_000)
        }
    }

    private fun playStream(url: String, offsetMs: Long, paused: Boolean) {
        playerView.visibility = View.VISIBLE
        val player = exoPlayer ?: return
        player.setMediaItem(MediaItem.fromUri(Uri.parse(url)))
        player.prepare()
        player.playWhenReady = !paused
        if (offsetMs > 0) {
            handler.postDelayed({ player.seekTo(offsetMs) }, 300)
        }
    }

    private fun seekIfNeeded(offsetMs: Long) {
        val player = exoPlayer ?: return
        if (kotlin.math.abs(player.currentPosition - offsetMs) > 900) {
            player.seekTo(offsetMs)
        }
    }

    private fun resolveStreamUrl(relativeOrAbsolute: String): String {
        val u = relativeOrAbsolute.trim()
        if (u.startsWith("http://") || u.startsWith("https://")) return u
        val origin = BuildConfig.STREAM_ORIGIN.trimEnd('/')
        val path = if (u.startsWith("/")) u else "/$u"
        return "$origin$path"
    }

    private fun hideAll() {
        handler.removeCallbacks(ndiStatusRunnable)
        handler.removeCallbacks(ndiRetryRunnable)
        ndiConnectInFlight = false
        if (currentNdiSource != null) {
            NdiReceiverBridge.disconnect()
            currentNdiSource = null
        }
        playerView.visibility = View.GONE
        imageView.visibility = View.GONE
        ndiSurfaceView.visibility = View.GONE
        ndiPlaceholder.visibility = View.GONE
        exoPlayer?.stop()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        ndiConnectInFlight = false
        if (ndiInitialized) {
            NdiReceiverBridge.disconnectSync()
            NdiReceiverBridge.shutdown()
            NdiAndroidBootstrap.release()
        }
        io.shutdownNow()
        exoPlayer?.release()
        exoPlayer = null
        super.onDestroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK, KeyEvent.KEYCODE_MENU -> {
                PlayerMenu.openSetup(this)
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    companion object {
        const val EXTRA_SCREEN_NUM = "screen_num"
    }
}
