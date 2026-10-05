package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView

class MainActivity : ComponentActivity() {

  private var webView: WebView? = null

  class AndroidBridge(private val context: Context) {
    @JavascriptInterface
    fun vibrate(durationMs: Long) {
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
          val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
          vibratorManager?.defaultVibrator?.vibrate(
            VibrationEffect.createOneShot(durationMs.coerceIn(5, 500), VibrationEffect.DEFAULT_AMPLITUDE)
          )
        } else {
          @Suppress("DEPRECATION")
          val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator?.vibrate(
              VibrationEffect.createOneShot(durationMs.coerceIn(5, 500), VibrationEffect.DEFAULT_AMPLITUDE)
            )
          } else {
            @Suppress("DEPRECATION")
            vibrator?.vibrate(durationMs.coerceIn(5, 500))
          }
        }
      } catch (_: Exception) {}
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()

    setContent {
      BackHandler {
        val wv = webView
        if (wv != null) {
          wv.evaluateJavascript("window.onAndroidBackPressed ? window.onAndroidBackPressed() : false") { result ->
            if (result != "true") {
              finish()
            }
          }
        } else {
          finish()
        }
      }

      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFF121316))
      ) {
        AndroidOSWebView(
          onWebViewCreated = { webView = it }
        )
      }
    }
  }

  override fun onDestroy() {
    webView?.destroy()
    webView = null
    super.onDestroy()
  }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun AndroidOSWebView(
  onWebViewCreated: (WebView) -> Unit,
  modifier: Modifier = Modifier
) {
  AndroidView(
    factory = { ctx ->
      WebView(ctx).apply {
        layoutParams = ViewGroup.LayoutParams(
          ViewGroup.LayoutParams.MATCH_PARENT,
          ViewGroup.LayoutParams.MATCH_PARENT
        )
        setBackgroundColor(android.graphics.Color.parseColor("#121316"))
        webViewClient = WebViewClient()
        webChromeClient = WebChromeClient()

        settings.apply {
          javaScriptEnabled = true
          domStorageEnabled = true
          allowFileAccess = true
          allowContentAccess = true
          useWideViewPort = true
          loadWithOverviewMode = true
          cacheMode = WebSettings.LOAD_DEFAULT
        }

        addJavascriptInterface(MainActivity.AndroidBridge(ctx), "AndroidBridge")
        loadUrl("file:///android_asset/index.html")
        onWebViewCreated(this)
      }
    },
    modifier = modifier.fillMaxSize()
  )
}
