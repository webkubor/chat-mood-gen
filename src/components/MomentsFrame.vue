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
        <div class="absolute inset-0 border-2 border-[#7A9D8C] rounded-[inherit] bg-[#7A9D8C]/5"></div>
      </div>

      <div class="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_0_2px_rgba(255,255,255,0.1)] z-40 hidden md:block"></div>

      <div
        class="w-full h-full relative flex flex-col overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.08)]"
        :class="[
          'rounded-none',
          chatStore.deviceType === 'ios' ? 'md:rounded-[43px]' : 'md:rounded-[25px]',
          isDark ? 'bg-[#101114]' : 'bg-[#f5f6f8]'
        ]"
      >
        <div
          class="relative z-30 flex flex-col transition-colors duration-300"
          :class="isDark ? 'bg-[#17181d]/95 backdrop-blur-xl border-b border-white/[0.05]' : 'bg-[#f5f6f8]/95 backdrop-blur-xl border-b border-black/[0.04]'"
        >
          <div v-if="chatStore.deviceType === 'ios'" class="w-full h-[44px] relative">
            <StatusBarIcons />
          </div>

          <div
            id="wechat-titlebar"
            ref="titleBarRef"
            class="flex items-center justify-between h-[48px] px-2"
            :class="isDark ? 'text-[#f4f5f6]' : 'text-[#1f2430]'"
          >
            <div class="flex items-center w-12 pl-2">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 20l-8-8 8-8" />
              </svg>
            </div>
            <div class="font-semibold text-[17px] tracking-[0.01em]">朋友圈</div>
            <div class="w-12 flex justify-end pr-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 7h14"/>
                <path d="M5 12h14"/>
                <path d="M5 17h14"/>
              </svg>
            </div>
          </div>
        </div>

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
