<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { useChatStore } from '../stores/chat'
import { getCaptureBounds } from '../utils/capture'
import StatusBarIcons from './StatusBarIcons.vue'
import AndroidNavBar from './AndroidNavBar.vue'

const chatStore = useChatStore()

const screenRef = ref<HTMLElement | null>(null)
const titleBarRef = ref<HTMLElement | null>(null)
const captureTop = ref(0)
const captureHeight = ref(0)
let resizeObserver: ResizeObserver | null = null

const isDark = computed(() => chatStore.previewTheme === 'dark')

// 与现有朋友圈/微信一致的「完整截图 / 3:4 / 1:3」裁切策略
const updateCaptureHeight = () => {
  const element = screenRef.value
  if (!element) return
  const bounds = getCaptureBounds(element, titleBarRef.value, chatStore.exportRatio, chatStore.keepStatusBar)
  captureTop.value = bounds.top
  captureHeight.value = bounds.visibleHeight
}

watch(() => [chatStore.exportRatio, chatStore.keepStatusBar, chatStore.deviceType], () => {
  nextTick(() => updateCaptureHeight())
})

onMounted(() => {
  updateCaptureHeight()
  if (screenRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => updateCaptureHeight())
    resizeObserver.observe(screenRef.value)
  }
  window.addEventListener('resize', updateCaptureHeight)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateCaptureHeight)
})
</script>

<template>
  <div class="flex flex-col items-center md:p-4">
    <div
      id="wechat-screen"
      ref="screenRef"
      :class="[
        'relative transition-all duration-500 bg-[#121212] box-content',
          'w-screen h-screen md:h-[812px] rounded-none md:shadow-[0_0_0_12px_#222,0_0_0_13px_#333,0_30px_60px_-15px_rgba(0,0,0,0.3)]',
          chatStore.deviceType === 'ios' ? 'md:w-[375px] md:rounded-[55px]' : 'md:w-[360px] md:h-[780px] md:rounded-[35px]'
        ]"
    >
      <div
        v-if="chatStore.isHighlightingCapture"
        data-export-ignore
        class="absolute left-0 z-40 pointer-events-none"
        :style="{ top: `${captureTop}px`, width: '100%', height: `${captureHeight}px` }"
      >
        <div class="absolute inset-0 border-2 border-[#FF2442] rounded-[inherit] bg-[#FF2442]/5"></div>
      </div>

      <div class="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_0_2px_rgba(255,255,255,0.1)] z-40 hidden md:block"></div>

      <div
        class="w-full h-full relative flex flex-col overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.06)]"
        :class="[
          'rounded-none',
          chatStore.deviceType === 'ios' ? 'md:rounded-[43px]' : 'md:rounded-[25px]',
          isDark ? 'bg-[#0d0d10]' : 'bg-[#f5f5f7]'
        ]"
      >
        <!-- 顶部栏 -->
        <div
          class="relative z-30 flex flex-col transition-colors duration-300"
          :class="isDark ? 'bg-[#1a1a1d]/95 backdrop-blur-xl border-b border-white/[0.05]' : 'bg-white/95 backdrop-blur-xl border-b border-black/[0.05]'"
        >
          <div v-if="chatStore.deviceType === 'ios'" class="w-full h-[44px] relative">
            <StatusBarIcons />
          </div>

          <!-- 小红书顶栏第一行：☰ + 搜索框 + 通知 -->
          <div
            id="wechat-titlebar"
            ref="titleBarRef"
            class="flex items-center gap-2 h-[48px] px-3"
            :class="isDark ? 'text-[#f4f5f6]' : 'text-[#1f2430]'"
          >
            <button class="w-7 h-7 flex items-center justify-center" aria-label="菜单">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
              </svg>
            </button>
            <div
              class="flex-1 h-8 rounded-full px-3 flex items-center gap-1.5 text-[12px]"
              :class="isDark ? 'bg-white/8 text-white/40' : 'bg-[#f1f1f3] text-[#999]'"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <span>搜索笔记</span>
            </div>
            <button class="w-7 h-7 flex items-center justify-center" aria-label="通知">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
          </div>

          <!-- 小红书次级 tab 行：关注 / 发现 / 附近 -->
          <div
            class="flex items-center justify-center gap-7 h-[36px] text-[13px] font-medium"
            :class="isDark ? 'text-white/70' : 'text-[#333]'"
          >
            <span class="opacity-50">关注</span>
            <span class="relative pb-2 -mb-2">
              发现
              <span class="absolute left-1/2 -translate-x-1/2 bottom-0 w-3.5 h-[3px] rounded-full bg-[#FF2442]"></span>
            </span>
            <span class="opacity-50">附近</span>
          </div>
        </div>

        <!-- 内容滚动区 -->
        <div data-export-scroll class="flex-1 overflow-y-auto scrollbar-hide relative z-0">
          <slot></slot>
        </div>

        <AndroidNavBar v-if="chatStore.deviceType === 'android'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
#wechat-screen {
  overflow: hidden;
}
</style>
