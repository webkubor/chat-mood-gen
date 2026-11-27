<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { ref, onMounted, watch } from 'vue'

const {
  offlineReady,
  needRefresh,
  updateServiceWorker
} = useRegisterSW()

// --- 核心状态 ---
const deferredPrompt = ref<any>(null)
const showInstallGuide = ref(false)
const isIOS = ref(false)
const isStandalone = ref(false)

const STORAGE_KEY = 'pwa_prompt_dismissed'

/**
 * 检查是否应该显示引导
 */
const shouldShowGuide = () => {
  const dismissedTime = localStorage.getItem(STORAGE_KEY)
  if (!dismissedTime) return true
  
  // 24小时内不重复提示
  const hoursElapsed = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60)
  return hoursElapsed > 24
}

const dismissGuide = () => {
  showInstallGuide.value = false
  localStorage.setItem(STORAGE_KEY, Date.now().toString())
}

/**
 * 初始化环境检测
 */
onMounted(() => {
  // 1. 检测是否已经是安装运行模式
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true

  // 2. 检测 iOS 环境
  isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream

  // 3. 监听浏览器安装事件 (Android/PC)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    // 如果不是在独立模式下，且没有被手动关闭，显示引导
    if (!isStandalone.value && shouldShowGuide()) {
      showInstallGuide.value = true
    }
  })

  // 4. 如果是 iOS 且未安装且未关闭，延迟 3 秒提示
  if (isIOS.value && !isStandalone.value && shouldShowGuide()) {
    setTimeout(() => {
      showInstallGuide.value = true
    }, 3000)
  }
})

// --- 逻辑处理 ---

// 监听到有新版本需要刷新
watch(needRefresh, (need) => {
  if (need) {
    window.$message.info('发现新版本，点击下方按钮更新', 0)
  }
})

// 监听到离线可用
watch(offlineReady, (ready) => {
  if (ready) {
    window.$message.success('应用已准备就绪，支持离线使用')
  }
})

/**
 * 触发原生安装提示 (Android/Chrome)
 */
const handleInstall = async () => {
  if (!deferredPrompt.value) return
  deferredPrompt.value.prompt()
  const { outcome } = await deferredPrompt.value.userChoice
  if (outcome === 'accepted') {
    deferredPrompt.value = null
    showInstallGuide.value = false
  }
}

/**
 * 执行版本更新
 */
const handleUpdate = async () => {
  await updateServiceWorker(true)
}
</script>

<template>
  <div class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-[340px] px-4 pointer-events-none">
    
    <!-- 场景 A: 发现新版本 -->
    <transition name="slide-up">
      <div v-if="needRefresh" class="pointer-events-auto bg-[#7A9D8C] text-white p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 border border-white/20">
        <div class="flex-1">
          <p class="text-xs font-bold uppercase tracking-wider opacity-80">Update Available</p>
          <p class="text-[13px] font-medium mt-0.5">新版本已准备就绪</p>
        </div>
        <button @click="handleUpdate" class="bg-white text-[#7A9D8C] px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-sm">
          立即更新
        </button>
      </div>
    </transition>

    <!-- 场景 B: 安装引导 (Android/PC) -->
    <transition name="slide-up">
      <div v-if="showInstallGuide && deferredPrompt" class="mt-3 pointer-events-auto bg-white/10 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-white/10 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-[#2C3639] rounded-2xl flex items-center justify-center shadow-lg">
            <img src="/logo-dark.svg" class="w-6 h-6" alt="" />
          </div>
          <div>
            <p class="text-xs font-bold text-[#7A9D8C]">WeChat Gen</p>
            <p class="text-[11px] text-white/60">像 App 一样流畅使用</p>
          </div>
        </div>
        <button @click="handleInstall" class="bg-[#7A9D8C] text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-all">
          安装
        </button>
        <button @click="dismissGuide" class="absolute -top-3 -right-3 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center text-[12px] shadow-lg border border-white/10 active:scale-90 transition-all">✕</button>
      </div>
    </transition>

    <!-- 场景 C: iOS 手动引导 -->
    <transition name="slide-up">
      <div v-if="showInstallGuide && isIOS && !deferredPrompt" class="mt-3 pointer-events-auto bg-white/10 backdrop-blur-2xl p-5 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col items-center text-center">
        <div class="w-12 h-12 bg-[#2C3639] rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <img src="/logo-dark.svg" class="w-7 h-7" alt="" />
        </div>
        <h4 class="text-sm font-bold text-white mb-1">添加到主屏幕</h4>
        <p class="text-[11px] text-white/50 leading-relaxed mb-4">
          点击下方的 <span class="bg-white/10 px-1.5 py-0.5 rounded mx-0.5 text-white/80">分享</span> 图标<br/>
          然后选择 <span class="bg-white/10 px-1.5 py-0.5 rounded mx-0.5 text-white/80">添加到主屏幕</span>
        </p>
        <button @click="dismissGuide" class="w-full py-3 bg-[#7A9D8C]/20 hover:bg-[#7A9D8C]/30 text-[#7A9D8C] rounded-2xl text-[12px] font-bold tracking-widest active:scale-95 transition-all">我知道了</button>
        
        <!-- 小箭头指向下方分享按钮 (示意) -->
        <div class="mt-4 animate-bounce text-[#7A9D8C]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>