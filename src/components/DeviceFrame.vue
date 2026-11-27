<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import { useChatStore } from '../stores/chat'
import { getCaptureBounds } from '../utils/capture'
import InputBarIcons from './InputBarIcons.vue'
import StatusBarIcons from './StatusBarIcons.vue'
import AndroidNavBar from './AndroidNavBar.vue'
import { useSound } from '../composables/useSound'

const props = withDefaults(defineProps<{ showComposer?: boolean }>(), { showComposer: true })

const chatStore = useChatStore()
const { playSuccess } = useSound()

const screenRef = ref<HTMLElement | null>(null)
const titleBarRef = ref<HTMLElement | null>(null)
const scrollContainer = ref<HTMLElement | null>(null)
const isDark = computed(() => chatStore.previewTheme === 'dark')
const captureTop = ref(0)
const captureHeight = ref(0)
const inputText = defineModel<string>('composer', { default: '' })
const isReadyToSend = computed(() => inputText.value.trim().length > 0)

const backgroundStyle = computed(() => {
  const hasImage = Boolean(chatStore.backgroundImage)
  const imageLayer = hasImage ? `url(${chatStore.backgroundImage})` : 'none'
  const overlay = isDark.value ? 'linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45))' : 'none'
  const backgroundImage = hasImage && isDark.value ? `${overlay}, ${imageLayer}` : imageLayer

  return {
    backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: isDark.value ? '#111111' : '#ededed'
  }
})

const updateCaptureHeight = () => {
  const element = screenRef.value
  if (!element) return
  const bounds = getCaptureBounds(element, titleBarRef.value, chatStore.exportRatio, chatStore.keepStatusBar)
  captureTop.value = bounds.top
  captureHeight.value = bounds.visibleHeight
}

const scrollToLatest = () => {
  if (!props.showComposer) return
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
}

watch(() => chatStore.activeMessages.at(-1)?.id, scrollToLatest)

let resizeObserver: ResizeObserver | null = null

watch(() => [chatStore.exportRatio, chatStore.keepStatusBar, chatStore.deviceType], () => {
  nextTick(() => updateCaptureHeight())
})

onMounted(() => {
  updateCaptureHeight()
  scrollToLatest()
  if (screenRef.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => updateCaptureHeight())
    resizeObserver.observe(screenRef.value)
  }
  window.addEventListener('resize', updateCaptureHeight)
})

const handleSend = () => {
  const content = inputText.value.trim()
  if (!content) return

  const currentName = chatStore.currentUser.name || '我'
  chatStore.addMessage({
    id: Math.random().toString(36).slice(2),
    type: 'text',
    content,
    sender: { name: currentName, avatar: chatStore.currentUser.avatar },
    isMe: true
  })
  inputText.value = ''
}

const onSendClick = () => {
  handleSend()
  playSuccess()
}

const onComposerEnter = (event: KeyboardEvent) => {
  if (event.isComposing) return
  event.preventDefault()
  onSendClick()
}

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', updateCaptureHeight)
})
</script>

<template>
  <div class="flex flex-col items-center md:p-4">
    <!-- 手机外壳 (PC端显示高端金属工艺感，移动端全屏) -->
    <div 
      id="wechat-screen"
      ref="screenRef"
      :class="[
        'relative transition-all duration-500 bg-[#121212] box-content',
        // 移动端逻辑：md以下 100vw/100vh，无圆角，无阴影
        'w-screen h-screen md:h-[812px] rounded-none md:shadow-[0_0_0_12px_#222,0_0_0_13px_#333,0_30px_60px_-15px_rgba(0,0,0,0.3)]',
        // PC端逻辑：恢复固定尺寸和圆角
        chatStore.deviceType === 'ios' 
          ? 'md:w-[375px] md:rounded-[55px]' 
          : 'md:w-[360px] md:h-[780px] md:rounded-[35px]'
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
      <!-- 屏幕内阴影 (仅PC端) -->
      <div class="absolute inset-0 pointer-events-none rounded-[inherit] shadow-[inset_0_0_2px_rgba(255,255,255,0.1)] z-40 hidden md:block"></div>

      <!-- 物理按键 (仅PC端显示) -->
      <div class="hidden md:block absolute -left-[14px] top-32 w-[3px] h-8 bg-[#333] rounded-l-sm border-r border-black/20"></div>
      <div class="hidden md:block absolute -left-[14px] top-48 w-[3px] h-14 bg-[#333] rounded-l-sm border-r border-black/20"></div>
      <div class="hidden md:block absolute -left-[14px] top-64 w-[3px] h-14 bg-[#333] rounded-l-sm border-r border-black/20"></div>
      <div class="hidden md:block absolute -right-[14px] top-44 w-[3px] h-20 bg-[#333] rounded-r-sm border-l border-black/20"></div>

      <!-- 天线位置线 (仅PC端显示) -->
      <div class="hidden md:block absolute top-10 -left-[12px] w-[12px] h-[2px] bg-black/40"></div>
      <div class="hidden md:block absolute bottom-10 -left-[12px] w-[12px] h-[2px] bg-black/40"></div>

      <!-- 屏幕内容容器 -->
      <div 
        class="w-full h-full relative flex flex-col overflow-hidden bg-[#ededed] shadow-[inset_0_0_40px_rgba(0,0,0,0.1)]"
        :class="[
          'rounded-none', // 移动端无圆角
          chatStore.deviceType === 'ios' ? 'md:rounded-[43px]' : 'md:rounded-[25px]' // PC端保持圆角
        ]"
        :style="backgroundStyle"
      >
        <!-- 1. 顶部导航区 -->
        <div
          class="relative z-30 flex flex-col transition-colors duration-300"
          :class="isDark ? 'bg-[#191919]/95 backdrop-blur-xl border-b border-white/[0.05]' : 'bg-[#ededed]/95 backdrop-blur-xl border-b border-black/[0.05]'"
        >
          <!-- iOS 状态栏 (像素级还原) -->
          <div v-if="chatStore.deviceType === 'ios'" class="w-full h-[44px] relative">
            <StatusBarIcons />
          </div>

          <!-- 微信标题栏 (核心还原点) -->
          <div
            id="wechat-titlebar"
            ref="titleBarRef"
            class="flex items-center justify-between h-[48px] px-2"
            :class="isDark ? 'text-[#f5f5f5]' : 'text-[#181818]'"
          >
            <!-- 微信标准返回箭头 -->
            <div class="flex items-center w-12 pl-2">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 20l-8-8 8-8" />
              </svg>
            </div>
            
            <!-- 居中标题 -->
            <div class="font-bold text-[17px] truncate max-w-[200px] text-center flex-1 tracking-[-0.01em]">
              {{ chatStore.groupTitle }}<span v-if="chatStore.isGroupChat" class="ml-0.5 font-normal text-[16px] opacity-60">({{ chatStore.memberCount }})</span>
            </div>
            
            <!-- 微信标准 "..." 更多按钮 -->
            <div class="w-12 flex justify-end pr-3">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                 <circle cx="5" cy="12" r="1.5" />
                 <circle cx="12" cy="12" r="1.5" />
                 <circle cx="19" cy="12" r="1.5" />
               </svg>
            </div>
          </div>
        </div>

        <!-- 2. 聊天内容区域 -->
        <div ref="scrollContainer" data-export-scroll class="flex-1 overflow-y-auto scrollbar-hide relative z-0 scroll-smooth">
          <slot></slot>
        </div>

        <!-- 3. 底部输入栏 (高保真模拟) -->
        <div v-if="showComposer" id="wechat-input-bar" class="relative z-20">
          <div
            class="border-t px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] transition-colors duration-300"
            :class="isDark ? 'bg-[#191919] border-white/5' : 'bg-[#f7f7f7] border-black/5'"
          >
            <div class="flex items-center gap-3 h-[36px]">
              <!-- 语音图标 -->
              <InputBarIcons type="voice" />

              <!-- 输入框 -->
              <input
                v-model="inputText"
                type="text"
                placeholder="输入消息"
                class="flex-1 h-[36px] px-3 text-[14px] rounded-[4px] border transition-all duration-300 outline-none"
                :class="isDark
                  ? 'bg-[#2c2c2e] border-transparent text-white/90 placeholder-white/40'
                  : 'bg-white border-black/[0.03] text-black/90 placeholder-black/40'"
                @keydown.enter="onComposerEnter"
              />

              <button
                v-if="isReadyToSend"
                type="button"
                @click="onSendClick"
                class="h-[32px] px-3 rounded-[4px] text-[13px] font-medium text-[#1f2a24] bg-[#95ec69] hover:bg-[#86df5f] transition-colors"
              >
                发送
              </button>
              <template v-else>
                <InputBarIcons type="emoji" />
                <InputBarIcons type="plus" />
              </template>
            </div>
          </div>
        </div>

        <!-- iOS Home Indicator -->
        <div
          v-if="chatStore.deviceType === 'ios'"
          class="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-current rounded-full z-30 opacity-20"
          :class="isDark ? 'text-white' : 'text-black'"
        ></div>

        <!-- Android 导航栏 (极简风格) -->
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

/* 模拟 iPhone 屏幕的圆角裁切效果，避免无 paint() 支持时整块不可见 */
#wechat-screen {
  overflow: hidden;
}

</style>
