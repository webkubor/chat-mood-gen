<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '../../stores/chat'
import { useSound } from '../../composables/useSound'

const chatStore = useChatStore()
const { playSuccess } = useSound()
const exportIndex = defineModel<number>('exportIndex', { required: true })
const isDownloading = defineModel<boolean>('isDownloading', { required: true })
const queue = defineModel<Array<{ id: string; url: string }>>('queue', { required: true })
const isQueueing = defineModel<boolean>('isQueueing', { required: true })
const previewUrl = ref<string | null>(null)
defineProps<{ isQuickDownloading: boolean }>()

const exportRatioOptions = [
  { label: '完整截图', value: 'full' },
  { label: '3:4 单卡（小红书）', value: '3:4' },
  { label: '1:3 长图文', value: '1:3' }
]

const openPreview = (url: string) => {
  previewUrl.value = url
}

const closePreview = () => {
  previewUrl.value = null
}

defineEmits<{
  (e: 'addToQueue'): void
  (e: 'removeFromQueue', id: string): void
  (e: 'clearQueue'): void
  (e: 'batchDownload'): void
}>()
</script>

<template>
  <div class="space-y-5 pt-4 border-t border-white/5">
    <div class="flex items-center gap-2 mb-2">
       <div class="w-1 h-4 bg-[#A27B5C] rounded-full"></div>
       <h3 class="text-sm font-medium text-white/80 tracking-wide">导出</h3>
    </div>

    <div class="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-6">
      <div class="group">
        <label for="export-ratio" class="block text-xs font-medium text-white/75 mb-2">导出比例</label>
        <select id="export-ratio" v-model="chatStore.exportRatio"
          class="w-full rounded-lg border border-white/20 bg-[#2C3639] px-3 py-2.5 text-sm text-white [color-scheme:dark]">
          <option v-for="option in exportRatioOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <p v-if="chatStore.exportRatio === 'full'" class="text-xs text-white/60 mt-2">完整截图包含可滚动区域里的全部内容。</p>
      </div>

      <div class="group">
        <label class="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors cursor-pointer select-none">
          <span class="relative inline-flex items-center">
            <input v-model="chatStore.keepStatusBar" type="checkbox" class="sr-only peer" />
            <span class="w-8 h-4 bg-white/10 border border-white/10 rounded-full transition-all peer-checked:bg-[#7A9D8C]/60 peer-checked:border-[#7A9D8C]/60"></span>
            <span class="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white/60 transition-all peer-checked:translate-x-4"></span>
          </span>
          保留顶部状态栏
        </label>
        <p class="text-xs text-white/60 mt-1">关闭后从标题栏开始导出。</p>
      </div>

      <div class="flex flex-col gap-3">

        <div class="rounded-xl border border-white/10 bg-black/10 p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] text-white/40 uppercase tracking-widest">待下载队列</span>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer select-none">
                <span class="relative inline-flex items-center">
                  <input v-model="chatStore.isHighlightingCapture" type="checkbox" class="sr-only peer" />
                  <span class="w-8 h-4 bg-white/10 border border-white/10 rounded-full transition-all peer-checked:bg-[#7A9D8C]/60 peer-checked:border-[#7A9D8C]/60"></span>
                  <span class="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white/60 transition-all peer-checked:translate-x-4"></span>
                </span>
                截图范围
              </label>
              <button v-if="queue.length" @click="$emit('clearQueue')" class="text-[10px] text-white/40 hover:text-white/70 transition-colors">清空队列</button>
            </div>
          </div>
          <div v-if="queue.length" class="grid grid-cols-4 gap-2">
            <div v-for="item in queue" :key="item.id" class="relative rounded-md overflow-hidden border border-white/10 bg-white/5">
              <button type="button" aria-label="查看队列图片" class="w-full text-left cursor-zoom-in" @click="openPreview(item.url)">
                <div class="w-full aspect-[3/4]">
                  <img :src="item.url" alt="" class="w-full h-full object-contain" />
                </div>
              </button>
              <button aria-label="从队列移除" @click="$emit('removeFromQueue', item.id)" class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] leading-5">×</button>
            </div>
          </div>
          <div v-if="queue.length" class="text-center text-[10px] text-white/30 mt-3">点击缩略图预览</div>
          <div v-else class="text-center text-[10px] text-white/30 py-3">暂无队列预览</div>
          <button @click="$emit('addToQueue'); playSuccess()" :disabled="isQueueing || isQuickDownloading || isDownloading" class="mt-3 w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-semibold text-sm border border-white/10 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <svg v-if="isQueueing" class="animate-spin h-4 w-4 text-white/70" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            <span>{{ isQueueing ? '加入中...' : '加入队列' }}</span>
          </button>
          <button v-if="queue.length" @click="$emit('batchDownload'); playSuccess()" :disabled="isDownloading || isQuickDownloading || isQueueing" class="mt-3 w-full py-3 bg-gradient-to-r from-[#7A9D8C] to-[#6B8E78] disabled:from-gray-600 disabled:to-gray-700 text-[#14201c] rounded-xl font-semibold text-sm shadow-[0_10px_30px_-10px_rgba(122,157,140,0.4)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
            <span v-if="!isDownloading">批量下载（{{ queue.length }}）</span>
            <span v-else class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              正在导出中...
            </span>
          </button>
        </div>
        <div v-if="isDownloading" class="text-center text-xs text-white/50">已导出 {{ exportIndex }} / {{ queue.length }} 张</div>
      </div>
      
      <p class="text-center text-[10px] text-white/30 tracking-wide leading-relaxed">
        批量下载会把队列中的图片打包成一个 ZIP。
      </p>
    </div>

    <Teleport to="body">
      <div v-if="previewUrl" class="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" @click.self="closePreview">
        <div class="relative max-w-[92vw] max-h-[92vh] rounded-2xl bg-black/40 border border-white/10 shadow-2xl p-4">
          <button type="button" class="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-black/80 text-white text-lg leading-8 text-center" @click="closePreview">×</button>
          <img :src="previewUrl" class="max-w-[88vw] max-h-[84vh] object-contain rounded-xl" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
