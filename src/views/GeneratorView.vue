<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'
import { useExport } from '../composables/useExport'
import DeviceFrame from '../components/DeviceFrame.vue'
import MomentsFrame from '../components/MomentsFrame.vue'
import XhsFrame from '../components/XhsFrame.vue'
import ChatView from '../components/ChatView.vue'
import ChatListView from '../components/ChatListView.vue'
import MomentsView from '../components/MomentsView.vue'
import XhsView from '../components/XhsView.vue'
import ConfigPanel from '../components/ConfigPanel.vue'
import ConfigFooter from '../components/config/ConfigFooter.vue'

const chatStore = useChatStore()
const exporter = useExport()
const { isDownloading, isQueueing, isQuickDownloading, handleQuickDownload } = exporter
const exportUnavailable = computed(() => !chatStore.initialized || isDownloading.value || isQueueing.value || isQuickDownloading.value)
const isEditorOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const editorPanel = ref<HTMLElement | null>(null)
const desktopMedia = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(desktopMedia.matches)

// 当前模式由 ConfigPanel 控制，这里需要获取它
const currentMode = ref<'chat' | 'join' | 'list' | 'moments' | 'xhs'>('chat')
const draftInputs = ref({ chat: '', join: '' })
const composerText = computed({
  get: () => draftInputs.value[chatStore.messageMode],
  set: (value: string) => { draftInputs.value[chatStore.messageMode] = value }
})

// 是否显示列表视图
const isListMode = computed(() => currentMode.value === 'list')
const isMomentsMode = computed(() => currentMode.value === 'moments')
const isXhsMode = computed(() => currentMode.value === 'xhs')

const openEditor = async () => {
  isEditorOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}

const closeEditor = async () => {
  if (!isEditorOpen.value) return
  isEditorOpen.value = false
  await nextTick()
  menuButton.value?.focus()
}

const syncViewport = (event: MediaQueryListEvent) => {
  isDesktop.value = event.matches
  if (event.matches) isEditorOpen.value = false
}

const containEditorFocus = (event: KeyboardEvent) => {
  if (isDesktop.value || !isEditorOpen.value || !editorPanel.value) return
  const controls = Array.from(editorPanel.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary'
  )).filter(control => control.tabIndex >= 0 && control.getClientRects().length > 0)
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  desktopMedia.addEventListener('change', syncViewport)
  void chatStore.init()
})
onBeforeUnmount(() => desktopMedia.removeEventListener('change', syncViewport))

// 监听模式变化（通过事件从 ConfigPanel 传递）
const handleModeChange = (mode: 'chat' | 'join' | 'list' | 'moments' | 'xhs') => {
  currentMode.value = mode
}
</script>

<template>
  <div class="generator-layout flex flex-col lg:flex-row h-dvh overflow-hidden bg-[#2C3639]">
    <section aria-label="图片预览" class="flex min-h-0 min-w-0 flex-1 flex-col" :inert="!isDesktop && isEditorOpen">
      <div class="generator-preview flex min-h-0 flex-1 justify-center overflow-auto">
        <div v-if="chatStore.initialized" class="lg:scale-95 xl:scale-100 drop-shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          <MomentsFrame v-if="isMomentsMode">
            <MomentsView />
          </MomentsFrame>
          <XhsFrame v-else-if="isXhsMode">
            <XhsView />
          </XhsFrame>
          <DeviceFrame v-else :key="currentMode" v-model:composer="composerText" :show-composer="!isListMode">
            <ChatListView v-if="isListMode" />
            <ChatView v-else />
          </DeviceFrame>
        </div>
        <p v-else role="status" class="text-sm text-white/80">正在读取本地预览…</p>
      </div>
      <div class="generator-toolbar grid shrink-0 grid-cols-2 gap-2 border-t border-white/10 px-3 pt-2 lg:hidden">
        <button ref="menuButton" type="button" class="editor-button" aria-controls="chat-editor"
          :aria-expanded="isEditorOpen" :disabled="!chatStore.initialized" @click="openEditor">编辑内容</button>
        <button type="button" class="editor-button editor-button-primary" :disabled="exportUnavailable" @click="handleQuickDownload">
          {{ isQuickDownloading ? '正在生成…' : '下载 PNG' }}
        </button>
      </div>
    </section>

    <aside id="chat-editor" ref="editorPanel" aria-labelledby="editor-title" :aria-modal="!isDesktop && isEditorOpen || undefined"
      :role="isDesktop ? undefined : 'dialog'" @keydown.esc="closeEditor" @keydown.tab="containEditorFocus"
      class="fixed inset-x-0 bottom-0 z-50 w-full flex-col overflow-hidden rounded-t-2xl border-t border-white/10 bg-[#2C3639] shadow-2xl lg:relative lg:flex lg:h-full lg:w-[416px] lg:shrink-0 lg:rounded-none lg:border-t-0 lg:border-l"
      :class="isEditorOpen ? 'flex max-h-[85dvh]' : 'hidden lg:flex'">
      <header class="shrink-0 space-y-3 border-b border-white/10 px-5 py-4 lg:px-6">
        <div class="flex items-center justify-between gap-2">
          <h1 id="editor-title" class="text-lg font-semibold text-[#E8F1F2]">Chat Mood Gen</h1>
          <router-link to="/treasure" class="text-sm text-[#b7d3c4] hover:underline">素材库</router-link>
        </div>
        <button ref="closeButton" type="button" class="editor-button lg:hidden" @click="closeEditor">返回预览</button>
        <button type="button" class="editor-button editor-button-primary hidden lg:flex" :disabled="exportUnavailable" @click="handleQuickDownload">
          {{ isQuickDownloading ? '正在生成…' : '下载 PNG' }}
        </button>
      </header>
      <div class="min-h-0 flex-1 overflow-y-auto p-5 lg:px-6">
        <ConfigPanel v-if="chatStore.initialized" :exporter="exporter" @modeChange="handleModeChange" />
        <ConfigFooter />
      </div>
    </aside>

    <div 
      v-if="isEditorOpen" 
      @click="closeEditor"
      class="fixed inset-0 z-40 bg-black/45 lg:hidden"
      aria-hidden="true"
    ></div>
  </div>
</template>

<style scoped>
.generator-layout { --toolbar-height: calc(60px + env(safe-area-inset-bottom, 0px)); }
.generator-preview { align-items: safe center; }
.generator-toolbar { height: var(--toolbar-height); padding-bottom: calc(7px + env(safe-area-inset-bottom, 0px)); }
.editor-button { align-items: center; justify-content: center; min-height: 42px; width: 100%; border: 1px solid #82948d; border-radius: 8px; padding: 0 12px; color: #e8f1f2; font-size: 14px; font-weight: 650; }
.editor-button:hover { background: #394745; }
.editor-button-primary { background: #a3c8b6; border-color: #a3c8b6; color: #14221d; }
.editor-button-primary:hover { background: #b6d5c5; }
.editor-button:disabled { opacity: .58; cursor: wait; }
.editor-button:focus-visible { outline: 2px solid #d4ede0; outline-offset: 2px; }
@media (max-width: 767px) {
  .generator-preview :deep(#wechat-screen) { height: calc(100dvh - var(--toolbar-height)); }
}
</style>
