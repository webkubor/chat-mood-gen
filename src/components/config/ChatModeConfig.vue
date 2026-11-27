<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useChatStore } from '../../stores/chat'
import { useCorpusStore } from '../../stores/corpus'
import { useSound } from '../../composables/useSound'
import AvatarLibrary from '../AvatarLibrary.vue'
import MuseavPicker from '../MuseavPicker.vue'

const chatStore = useChatStore()
const corpusStore = useCorpusStore()
const { playSuccess, playWater } = useSound()

const genCount = ref(10)
const MIN_GEN_COUNT = 5
const MAX_GEN_COUNT = 60
const hasMessages = computed(() => chatStore.activeMessages.length > 0)

onMounted(async () => {
  await corpusStore.init()
})

watch(genCount, (value) => {
  if (!Number.isFinite(value)) {
    genCount.value = MIN_GEN_COUNT
    return
  }
  const normalized = Math.min(MAX_GEN_COUNT, Math.max(MIN_GEN_COUNT, Math.round(value)))
  if (normalized !== value) {
    genCount.value = normalized
  }
})

const handleGenerate = () => {
  chatStore.batchAddRandomDialog(genCount.value)
}

const onGenerateClick = () => {
  handleGenerate()
  playSuccess()
}

const handleClearAll = async () => {
  if (!hasMessages.value) {
    window.$message?.info('暂无可清空的内容')
    return
  }

  const confirmed = window.$confirm
    ? await window.$confirm({
        title: '确认清空？',
        message: '此操作会删除当前聊天内容，无法撤销。',
        confirmText: '确认清空',
        cancelText: '取消',
        confirmType: 'danger'
      })
    : false

  if (!confirmed) return

  chatStore.clearMessages()
  window.$message?.success('聊天内容已清空')
}

const onClearAllClick = async () => {
  await handleClearAll()
  playWater()
}

const showAvatarLibrary = ref(false)
const isBgUploading = ref(false)
// 从 MUSE AV 选一张当聊天背景。chatStore.setBg 收的就是一个图片地址，
// 所以中台作品的 cdn_url 直接给它 —— 本地上传那条路是 FileReader 转 dataURL，
// 两者都只是「一个能渲染的图源」。
const showMuseavBg = ref(false)

function onMuseavBgPick(url: string) {
  chatStore.setBg(url)
  showMuseavBg.value = false
  window.$message?.success('已设为聊天背景')
}

const handleBgUpload = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isBgUploading.value = true
  const reader = new FileReader()
  reader.onload = (ev) => {
    chatStore.setBg(ev.target?.result as string)
  }
  reader.onerror = () => {
    window.$message?.error('背景上传失败，请重试')
  }
  reader.onloadend = () => {
    isBgUploading.value = false
    input.value = ''
  }
  reader.readAsDataURL(file)
}

const idiomText = ref('')
const redPacketSender = ref<'me' | 'random'>('me')
const redPacketReceiver = ref<'me' | 'random'>('random')

const handleIdiomReplace = () => {
  const text = idiomText.value.trim()
  if (!text) {
    window.$message?.info('请输入内容')
    return
  }
  if (chatStore.activeMessages.length === 0) {
    window.$message?.info('暂无消息可替换')
    return
  }

  chatStore.activeMessages.forEach((msg) => {
    if (msg.type === 'text') {
      msg.content = text
    }
  })
  chatStore.save()
  window.$message?.success('已将所有消息替换为输入内容')
  idiomText.value = ''
}

const onIdiomReplaceClick = () => {
  handleIdiomReplace()
  playSuccess()
}

const onInviteClick = () => {
  chatStore.addInviteSystemMessage()
  playSuccess()
}

const onRedPacketClick = () => {
  const senderName = redPacketSender.value === 'me' ? chatStore.currentUser.name || '我' : (
    corpusStore.nicknames.length > 0
      ? corpusStore.nicknames[Math.floor(Math.random() * corpusStore.nicknames.length)]?.content || '小明'
      : '小明'
  )
  chatStore.addRedPacketSystemMessage(senderName)
  playSuccess()
}

const onRedPacketOpenedClick = () => {
  const validNicknames = corpusStore.nicknames.filter(n => n.content)
  const nicknameList = validNicknames.map(n => n.content!)

  const receivedBy = redPacketReceiver.value === 'me' ? chatStore.currentUser.name || '我' : (
    nicknameList.length > 0
      ? nicknameList[Math.floor(Math.random() * nicknameList.length)]!
      : '小明'
  )

  const sentBy = redPacketSender.value === 'me' ? chatStore.currentUser.name || '我' : (
    nicknameList.length > 0
      ? nicknameList[Math.floor(Math.random() * nicknameList.length)]!
      : '小明'
  )

  chatStore.addRedPacketOpenedMessage(receivedBy, sentBy)
  playSuccess()
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center gap-2 mb-2">
       <div class="w-1 h-4 bg-[#6B8E78] rounded-full"></div>
       <h3 class="text-sm font-medium text-white/80 tracking-wide">内容设置</h3>
    </div>

    <div class="group">
      <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2 group-focus-within:text-[#7A9D8C] transition-colors">群聊标题</label>
      <div class="flex gap-3">
        <input
          v-model="chatStore.groupTitle"
          type="text"
          placeholder="群聊名称"
          class="flex-1 bg-white/5 hover:bg-white/10 border border-transparent focus:border-[#7A9D8C]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:ring-4 focus:ring-[#7A9D8C]/10 transition-all duration-300"
        />
        <div class="w-24 relative">
           <input
            v-model.number="chatStore.memberCount"
            type="number"
            class="w-full bg-white/5 hover:bg-white/10 border border-transparent focus:border-[#7A9D8C]/50 rounded-xl px-3 py-3 text-sm text-white text-center focus:outline-none focus:ring-4 focus:ring-[#7A9D8C]/10 transition-all duration-300"
            placeholder="188"
          />
          <span class="absolute right-3 top-3.5 text-[10px] text-white/30 pointer-events-none">人</span>
        </div>
      </div>
    </div>

    <div class="group">
      <label class="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors cursor-pointer select-none">
        <span class="relative inline-flex items-center">
          <input v-model="chatStore.isGroupChat" type="checkbox" class="sr-only peer" />
          <span class="w-8 h-4 bg-white/10 border border-white/10 rounded-full transition-all peer-checked:bg-[#7A9D8C]/60 peer-checked:border-[#7A9D8C]/60"></span>
          <span class="absolute left-0.5 top-0.5 w-3 h-3 rounded-full bg-white/60 transition-all peer-checked:translate-x-4"></span>
        </span>
        群聊形态
      </label>
      <p class="text-[10px] text-white/30 mt-1 leading-relaxed">开着：标题带人数、消息显示昵称；关掉 = 单聊形态（标题只有名字，不显示昵称）</p>
    </div>

    <div>
      <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2">我的头像</label>
      <div class="flex items-center gap-3">
        <button
          @click="showAvatarLibrary = true"
          class="relative w-[46px] h-[46px] bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl cursor-pointer transition-all group hover:border-[#7A9D8C]/50 overflow-hidden"
        >
          <span v-if="!chatStore.currentUser.avatar" class="text-xs text-white/40 group-hover:text-[#7A9D8C] transition-colors">选择</span>
          <div v-else class="w-full h-full rounded-[10px] overflow-hidden">
            <img :src="chatStore.currentUser.avatar" class="w-full h-full object-cover object-center" />
          </div>
        </button>
        <button
          @click="showAvatarLibrary = true"
          class="text-xs text-white/40 hover:text-[#7A9D8C] transition-colors"
        >
          从头像库选择
        </button>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest">聊天背景</label>
        <button
          @click="showMuseavBg = true"
          class="text-[10px] text-[#7A9D8C] hover:text-white transition-colors tracking-wider"
        >
          从 MUSE AV 选 →
        </button>
      </div>
      <label class="flex items-center justify-center w-full h-[46px] bg-white/5 hover:bg-white/10 border border-white/10 border-dashed rounded-xl cursor-pointer transition-all duration-300 group hover:border-[#7A9D8C]/50">
        <span class="text-xs text-white/40 group-hover:text-[#7A9D8C] transition-colors">
          {{ isBgUploading ? '上传中，请勿离开页面' : '上传图片' }}
        </span>
        <svg v-if="isBgUploading" class="w-4 h-4 ml-2 animate-spin text-white/60" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <input type="file" @change="handleBgUpload" accept="image/*" class="hidden" :disabled="isBgUploading" />
      </label>
    </div>

    <div class="flex gap-2 items-center">
      <div class="group flex-1">
        <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2">发言条数</label>
        <input
          v-model.number="genCount"
          type="number"
          :min="MIN_GEN_COUNT"
          :max="MAX_GEN_COUNT"
          class="w-full bg-white/5 hover:bg-white/10 border border-transparent focus:border-[#7A9D8C]/50 rounded-xl px-4 py-3 text-sm text-white text-center focus:outline-none focus:ring-4 focus:ring-[#7A9D8C]/10 transition-all duration-300"
        />
      </div>
      <button
        @click="onGenerateClick"
        class="mt-5 px-4 py-3 bg-[#7A9D8C]/60 hover:bg-[#7A9D8C]/80 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
      >
        生成
      </button>
    </div>

    <div class="group">
      <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2">统一内容（成语接龙）</label>
      <div class="flex gap-2">
        <input
          v-model="idiomText"
          type="text"
          placeholder="输入内容后替换所有消息"
          class="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7A9D8C]/50 transition-all"
          @keydown.enter="handleIdiomReplace"
        />
        <button
          @click="onIdiomReplaceClick"
          :disabled="!idiomText.trim()"
          class="px-4 py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-sm font-medium border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          替换
        </button>
      </div>
    </div>

    <div class="group">
      <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2">红包设置</label>
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block text-[9px] text-white/30 mb-1.5">发红包人</label>
          <select
            v-model="redPacketSender"
            class="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9D8C]/50 transition-all"
          >
            <option value="me">我</option>
            <option value="random">随机</option>
          </select>
        </div>
        <div>
          <label class="block text-[9px] text-white/30 mb-1.5">领取红包人</label>
          <select
            v-model="redPacketReceiver"
            class="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9D8C]/50 transition-all"
          >
            <option value="me">我</option>
            <option value="random">随机</option>
          </select>
        </div>
      </div>
    </div>

    <div class="group">
      <label class="block text-[10px] font-medium text-white/40 uppercase tracking-widest mb-2">群聊功能</label>
      <div class="grid grid-cols-3 gap-2">
        <button
          @click="onInviteClick"
          class="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-medium border border-white/10 transition-all"
        >
          拉人进群
        </button>
        <button
          @click="onRedPacketClick"
          class="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-medium border border-white/10 transition-all"
        >
          发红包
        </button>
        <button
          @click="onRedPacketOpenedClick"
          class="py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl text-xs font-medium border border-white/10 transition-all"
        >
          领取红包
        </button>
      </div>
    </div>

    <button
      @click="onClearAllClick"
      :disabled="!hasMessages"
      title="清空所有聊天内容"
      class="w-full py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-200 rounded-xl font-medium text-sm border border-red-400/20 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
    >
      清屏
    </button>

    <AvatarLibrary
      v-if="showAvatarLibrary"
      v-model="chatStore.currentUser.avatar"
      @close="showAvatarLibrary = false"
    />

    <MuseavPicker
      v-if="showMuseavBg"
      purpose="选作聊天背景"
      ratio="3:4"
      @pick="onMuseavBgPick"
      @close="showMuseavBg = false"
    />
  </div>
</template>
