<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useChatStore } from '../../stores/chat'
import { useCorpusStore } from '../../stores/corpus'
import { useSound } from '../../composables/useSound'

const chatStore = useChatStore()
const corpusStore = useCorpusStore()
const { playSuccess, playWater } = useSound()

const genCount = ref(10)
const MIN_GEN_COUNT = 5
const MAX_GEN_COUNT = 60
const hasMessages = computed(() => chatStore.activeMessages.length > 0)
const redPacketSender = ref<'random'>('random')
const redPacketReceiver = ref<'random'>('random')

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
  chatStore.batchAddJoinMessages(genCount.value)
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

const onInviteClick = () => {
  chatStore.addInviteSystemMessage()
  playSuccess()
}

const onRedPacketClick = () => {
  const senderName = corpusStore.nicknames.length > 0
    ? corpusStore.nicknames[Math.floor(Math.random() * corpusStore.nicknames.length)]?.content || '小明'
    : '小明'
  chatStore.addRedPacketSystemMessage(senderName)
  playSuccess()
}

const onRedPacketOpenedClick = () => {
  const validNicknames = corpusStore.nicknames.filter(n => n.content)
  const nicknameList = validNicknames.map(n => n.content!)

  const receivedBy = nicknameList.length > 0
    ? nicknameList[Math.floor(Math.random() * nicknameList.length)]!
    : '小明'

  const sentBy = corpusStore.nicknames.length > 0
    ? corpusStore.nicknames[Math.floor(Math.random() * corpusStore.nicknames.length)]?.content || '小明'
    : '小明'

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
        @click="handleGenerate"
        class="mt-5 px-4 py-3 bg-[#7A9D8C]/60 hover:bg-[#7A9D8C]/80 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98]"
      >
        生成
      </button>
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
            <option value="random">随机</option>
          </select>
        </div>
        <div>
          <label class="block text-[9px] text-white/30 mb-1.5">领取红包人</label>
          <select
            v-model="redPacketReceiver"
            class="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7A9D8C]/50 transition-all"
          >
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
  </div>
</template>
