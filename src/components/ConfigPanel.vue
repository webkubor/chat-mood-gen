<script setup lang="ts">
import { ref, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useChatListStore } from '../stores/chatList'
import { useMomentsStore } from '../stores/moments'
import { useXhsStore } from '../stores/xhs'
import type { useExport } from '../composables/useExport'

// 子组件导入
import BasicConfig from './config/BasicConfig.vue'
import ExportConfig from './config/ExportConfig.vue'
import ChatModeConfig from './config/ChatModeConfig.vue'
import JoinModeConfig from './config/JoinModeConfig.vue'
import ChatListModeConfig from './config/ChatListModeConfig.vue'
import MomentsModeConfig from './config/MomentsModeConfig.vue'
import XhsModeConfig from './config/XhsModeConfig.vue'

const chatStore = useChatStore()
const chatListStore = useChatListStore()
const momentsStore = useMomentsStore()
const xhsStore = useXhsStore()

const emit = defineEmits<{
  modeChange: [mode: 'chat' | 'join' | 'list' | 'moments' | 'xhs']
}>()

const currentMode = ref<'chat' | 'join' | 'list' | 'moments' | 'xhs'>('chat')

const { exporter } = defineProps<{ exporter: ReturnType<typeof useExport> }>()
const { isDownloading, isQueueing, isQuickDownloading, exportIndex, queue, addToQueue, removeFromQueue, clearQueue, handleBatchDownload } = exporter
const initializedModes = new Set<typeof currentMode.value>()
const isSwitchingMode = ref(false)

const changeMode = async (mode: typeof currentMode.value) => {
  if (mode === currentMode.value || isSwitchingMode.value) return
  isSwitchingMode.value = true
  try {
    if (mode === 'chat' || mode === 'join') await chatStore.setMessageMode(mode)
    currentMode.value = mode
  } finally {
    isSwitchingMode.value = false
  }
}

// 监听模式切换
watch(currentMode, (newMode) => {
  emit('modeChange', newMode)
  if (newMode === 'chat' || newMode === 'join' || initializedModes.has(newMode)) return
  initializedModes.add(newMode)
  if (newMode === 'list') {
    chatListStore.init()
  } else if (newMode === 'moments') {
    momentsStore.init()
  } else {
    xhsStore.init()
  }
})
</script>

<template>
  <div class="space-y-8 relative">
    <!-- 模式切换 -->
    <div class="group">
      <div class="bg-black/20 p-1.5 rounded-2xl flex relative overflow-hidden backdrop-blur-sm">
        <button v-for="mode in (['chat', 'join', 'list', 'moments', 'xhs'] as const)" :key="mode" type="button"
          @click="changeMode(mode)" :aria-pressed="currentMode === mode"
          :disabled="isQueueing || isQuickDownloading || isSwitchingMode"
          class="flex-1 py-2.5 min-h-10 rounded-xl text-xs font-medium transition-colors relative z-10"
          :class="currentMode === mode ? 'text-[#162422]' : 'text-white/75 hover:text-white'">
          {{ { chat: '对话', join: '拉人', list: '列表', moments: '朋友圈', xhs: '小红书' }[mode] }}
        </button>
        <div class="absolute top-1.5 bottom-1.5 w-[calc(20%-4.8px)] rounded-xl transition-all duration-500 ease-spring"
             :class="[
               currentMode === 'xhs' ? 'bg-[#FF2442]' : 'bg-[#7A9D8C]',
               currentMode === 'chat' ? 'left-1.5' :
               currentMode === 'join' ? 'left-[calc(20%+1.5px)]' :
               currentMode === 'list' ? 'left-[calc(40%+1.2px)]' :
               currentMode === 'moments' ? 'left-[calc(60%+0.9px)]' :
               'left-[calc(80%+0.6px)]'
             ]"></div>
      </div>
    </div>

    <!-- 1. 内容设置模块 -->
    <ChatModeConfig v-if="currentMode === 'chat'" />
    <JoinModeConfig v-if="currentMode === 'join'" />
    <ChatListModeConfig v-if="currentMode === 'list'" />
    <MomentsModeConfig v-if="currentMode === 'moments'" />
    <XhsModeConfig v-if="currentMode === 'xhs'" />

    <!-- 2. 外观设置模块 -->
    <BasicConfig />

    <!-- 3. 导出与操作模块 -->
    <ExportConfig
      v-model:exportIndex="exportIndex"
      v-model:isDownloading="isDownloading"
      v-model:isQueueing="isQueueing"
      v-model:queue="queue"
      :is-quick-downloading="isQuickDownloading"
      @add-to-queue="addToQueue"
      @remove-from-queue="removeFromQueue"
      @clear-queue="clearQueue"
      @batch-download="handleBatchDownload"
    />
  </div>
</template>

<style scoped>
.ease-spring {
  transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
