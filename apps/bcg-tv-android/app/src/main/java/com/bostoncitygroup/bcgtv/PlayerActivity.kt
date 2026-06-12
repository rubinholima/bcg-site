package com.bostoncitygroup.bcgtv

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PlayerActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var loadingBar: ProgressBar
    private lateinit var errorText: TextView
    private val handler = Handler(Looper.getMainLooper())
    private var screenNum = 0

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_player)

        screenNum = intent.getIntExtra(EXTRA_SCREEN_NUM, Prefs.getScreenNum(this))
        if (screenNum !in 1..21) {
            startActivity(Intent(this, SetupActivity::class.java))
            finish()
            return
        }

        webView = findViewById(R.id.playerWebView)
        loadingBar = findViewById(R.id.loadingBar)
        errorText = findViewById(R.id.errorText)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString = "${userAgentString} BcgTvPlayer/${BuildConfig.VERSION_NAME}"
        }

        webView.webChromeClient = WebChromeClient()
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                loadingBar.visibility = View.GONE
                errorText.visibility = View.GONE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                if (request?.isForMainFrame != true) return
                showErrorAndRetry()
            }
        }

        loadPlayer()
    }

    private fun playerUrl(): String = "${BuildConfig.PLAYER_BASE_URL}$screenNum"

    private fun loadPlayer() {
        loadingBar.visibility = View.VISIBLE
        errorText.visibility = View.GONE
        webView.loadUrl(playerUrl())
    }

    private fun showErrorAndRetry() {
        loadingBar.visibility = View.GONE
        errorText.visibility = View.VISIBLE
        handler.removeCallbacks(retryRunnable)
        handler.postDelayed(retryRunnable, 8000)
    }

    private val retryRunnable = Runnable { loadPlayer() }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacks(retryRunnable)
        webView.destroy()
        super.onDestroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        when (keyCode) {
            KeyEvent.KEYCODE_BACK -> {
                if (webView.canGoBack()) {
                    webView.goBack()
                    return true
                }
                moveTaskToBack(true)
                return true
            }
            KeyEvent.KEYCODE_MENU -> {
                startActivity(
                    Intent(this, SetupActivity::class.java).apply {
                        putExtra(SetupActivity.EXTRA_FORCE_SETUP, true)
                    },
                )
                return true
            }
        }
        return super.onKeyDown(keyCode, event)
    }

    companion object {
        const val EXTRA_SCREEN_NUM = "screen_num"
    }
}
