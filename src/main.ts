import { trackUsage } from './utils/analytics'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import './style.css'
import App from './App.vue'
import { initMessage } from './utils/message'
import { initConfirm } from './utils/confirm'
import { initAudioOnClick } from './composables/useSound'

// 初始化全局消息提示 (window.$message)
const $message = initMessage()
initConfirm()
initAudioOnClick()

/**
 * 全局错误处理：提示 + 自动复制到剪贴板
 */
const handleError = (error: any) => {
  const message = error?.message || String(error)
  
  // 网络类错误单独给提示，避免用户以为是页面坏了
  if (message.includes('network request error')) {
    $message.error('网络请求失败：请检查网络连接')
  } else {
    $message.error(`系统错误: ${message}`)
  }
  
  // 自动复制到剪贴板 (用户偏好)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(message).catch(() => {})
  }
}

// 捕获同步/异步错误
window.onerror = (msg) => handleError(msg)
window.onunhandledrejection = (event) => handleError(event.reason)

const app = createApp(App)
app.config.errorHandler = (err) => handleError(err)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Count a loaded application once; editor state and route names stay local.
trackUsage('page.view')
