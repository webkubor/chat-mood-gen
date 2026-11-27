<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '../stores/chat'
import { useSound } from '../composables/useSound'

const chatStore = useChatStore()
const { playWater } = useSound()

const WECHAT_GREEN = '#95ec69'
const isDark = computed(() => chatStore.previewTheme === 'dark')

const getBubbleStyle = (isMe?: boolean) => {
  if (isDark.value) {
    return {
      backgroundColor: isMe ? '#2f7a4a' : '#2a2a2e',
      color: '#f1f1f1'
    }
  }

  return {
    backgroundColor: isMe ? WECHAT_GREEN : '#ffffff',
    color: '#191919'
  }
}

const getArrowStyle = (isMe?: boolean) => {
  const backgroundColor = getBubbleStyle(isMe).backgroundColor
  return isMe
    ? {
        borderLeftColor: backgroundColor,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: 'transparent'
      }
    : {
        borderRightColor: backgroundColor,
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent'
      }
}

const getSystemMsgStyle = () => {
  if (isDark.value) {
    return {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      color: 'rgba(255, 255, 255, 0.5)'
    }
  }
  return {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    color: '#adadad'
  }
}

const getRedPacketStyle = (isMe?: boolean) => {
  if (isDark.value) {
    return {
      backgroundColor: isMe ? '#c85a3e' : '#a0422d',
      textColor: isMe ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.8)'
    }
  }
  return {
    backgroundColor: isMe ? '#f85a59' : '#fa9d3b',
    textColor: isMe ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.5)'
  }
}

const getSystemNameColor = computed(() => {
  return isDark.value ? '#7d90a9' : '#576b95'
})

const handlePaste = (e: ClipboardEvent) => {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain')
  if (text) {
    document.execCommand('insertText', false, text)
  }
}

const editedFields = new WeakSet<HTMLElement>()

const markEdited = (event: Event) => {
  if (event.target instanceof HTMLElement) editedFields.add(event.target)
}

const saveEdit = (event: FocusEvent, id: string, field: 'content' | 'name') => {
  const element = event.target
  if (element instanceof HTMLElement && editedFields.delete(element)) {
    chatStore.updateMessage(id, field, element.innerText)
  }
}

const onRemoveMessageClick = (id: string) => {
  chatStore.removeMessage(id)
  playWater()
}

const handleSystemMessageDoubleClick = (id: string) => {
  chatStore.removeMessage(id)
  playWater()
}
</script>

<template>
  <div class="p-4 space-y-4 pb-10 pt-2">
    <div v-for="msg in chatStore.activeMessages" :key="msg.id" class="flex flex-col group/msg relative">

      <!-- 时间戳分隔（真实微信每隔一段会插一条时间，填了 timestamp 才显示） -->
      <div v-if="msg.timestamp" class="flex justify-center my-1">
        <span class="text-[11px] leading-none text-[#a8a8a8]">{{ msg.timestamp }}</span>
      </div>

      <!-- 系统消息 -->
      <div v-if="msg.type === 'system'" class="flex justify-center my-1 relative">
        <div
          class="text-[11px] px-2.5 py-0.5 rounded-[4px] leading-tight max-w-[85%] text-center inline-block cursor-pointer transition-colors duration-300 hover:opacity-70"
          :style="getSystemMsgStyle()"
          @dblclick="handleSystemMessageDoubleClick(msg.id)"
        >
          <span v-html="msg.content"></span>
        </div>
        <!-- 移动端长按删除提示可以放在这里，目前先通过 PC 悬浮按钮实现 -->
      </div>

      <!-- 领取红包消息 -->
      <!--
        必须是 v-else-if：这三个分支（system / red-packet-opened / 普通消息）是同一条互斥链。
        原先这里写 v-if，于是 v-else 只跟它配对，system 类型的消息会先命中上面那条 v-if
        渲染成灰色系统提示，再落进这条链的 v-else 又渲染出一个带头像的普通气泡 ——
        气泡用 {{ }} 插值，把 addInviteSystemMessage 拼进 content 的
        <span class="system-name"> 原样打了出来。拉人模式每条消息都会重复一次。
      -->
      <div v-else-if="msg.type === 'red-packet-opened'" class="flex justify-center my-2.5 px-6">
        <div
          :class="[
            'flex items-center gap-2 px-3.5 py-1 rounded-[6px] backdrop-blur-md shadow-sm transition-colors',
            isDark ? 'bg-black/30' : 'bg-black/10'
          ]"
        >
          <!-- Tiny Red Packet Icon -->
          <div class="w-[13px] h-[16px] bg-[#f54f42] rounded-[1px] relative flex items-center justify-center border-[0.5px] border-[#d33a2e] flex-shrink-0">
            <div class="w-[3.5px] h-[3.5px] bg-[#ffd46b] rounded-full"></div>
            <div class="absolute top-[3px] left-0 right-0 h-[0.3px] bg-[#d33a2e]/40"></div>
          </div>

          <span class="text-[12px] font-normal leading-none text-white/70" v-html="msg.content"></span>
        </div>
      </div>

      <!-- 普通消息 -->
      <div v-else :class="['flex gap-2.5 items-start', msg.isMe ? 'flex-row-reverse' : 'flex-row']">
        <!-- 头像 -->
        <div
          class="w-10 h-10 rounded-[4px] overflow-hidden flex-shrink-0 bg-gray-100 shadow-[0_0_1px_rgba(0,0,0,0.1)]"
        >
          <img v-if="msg.sender?.avatar" :src="msg.sender.avatar" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center bg-gray-300 text-gray-500 font-bold text-sm">
            {{ msg.sender?.name?.charAt(0) || 'U' }}
          </div>
        </div>

        <!-- 内容容器 -->
        <div class="flex flex-col" :class="msg.isMe ? 'items-end' : 'items-start'">
          <!-- 昵称：单聊模式（不显示群人数）下微信不显示昵称 -->
          <div
            v-if="!msg.isMe && chatStore.isGroupChat"
            class="mb-0.5 ml-0.5 scale-90 origin-bottom-left outline-none min-w-[20px]"
            contenteditable
            @input="markEdited"
            @blur="saveEdit($event, msg.id, 'name')"
            @paste="handlePaste"
            :style="{
              color: chatStore.nicknameColor,
              fontSize: chatStore.nicknameSize + 'px',
              fontFamily: chatStore.nicknameFont
            }"
          >
            {{ msg.sender?.name }}
          </div>

          <div class="flex items-center gap-2 relative group/msg">
            <!-- 红包气泡 -->
            <div
              v-if="msg.type === 'redpacket'"
              class="relative w-[232px] cursor-pointer active:brightness-95 transition-all group"
            >
              <!-- Bubble Tail (角标) - Outside overflow-hidden container -->
              <div
                :class="[
                  'absolute top-[14px] w-3 h-3 rotate-45 z-0',
                  msg.isMe ? '-right-1.5 bg-[#fa9d3b]' : '-left-1.5 bg-[#fa9d3b]'
                ]"
              ></div>

              <!-- Main Container with Rounded Corners and Clipping for Internal Elements -->
              <div
                class="relative z-10 rounded-[6px] overflow-hidden bg-[#fa9d3b] shadow-sm"
                :style="{ backgroundColor: getRedPacketStyle(msg.isMe).backgroundColor }"
              >
                <!-- Main Content Area -->
                <div class="px-[14px] py-[12px] flex items-center gap-3">
                  <!-- Red Packet Icon - High Fidelity Curved Flap & Two-Tone Red -->
                  <div class="w-[36px] h-[48px] rounded-[3px] flex-shrink-0 relative overflow-hidden shadow-md bg-[#f45c4d]">
                    <!-- Top Flap (Darker Red) with Curved Bottom Edge -->
                    <div class="absolute top-0 left-[-20%] w-[140%] h-[42%] bg-[#f24438] rounded-b-[60%] shadow-[0_1px_2px_rgba(0,0,0,0.1)]"></div>

                    <!-- Subtle flap shadow/depth -->
                    <div class="absolute top-[40%] left-0 right-0 h-[1px] bg-black/5"></div>

                    <!-- Gold Coin with ¥ symbol - Positioned exactly on arc center -->
                    <div class="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[16px] h-[16px] bg-[#fcd46d] rounded-full border-[0.5px] border-[#e2b85a] flex items-center justify-center text-[9px] text-[#f24438] font-black leading-none shadow-sm z-20">
                      <span class="scale-[0.9]">¥</span>
                    </div>

                    <!-- Bottom highlight/texture for lighter red part -->
                    <div class="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/5 to-transparent"></div>
                  </div>

                  <!-- Blessing Text -->
                  <div class="flex-1">
                    <div class="text-white text-[15.5px] font-normal leading-snug line-clamp-2 tracking-wide">
                      {{ msg.content || "恭喜发财，大吉大利" }}
                    </div>
                  </div>
                </div>

                <!-- Subtle Divider Line above footer - Matches with screenshot precisely -->
                <div class="h-[0.5px] w-full bg-white opacity-[0.15]"></div>

                <!-- Footer Band -->
                <div
                  class="px-[14px] py-[6.5px] text-[10.5px] transition-colors"
                  :style="{ color: getRedPacketStyle(msg.isMe).textColor }"
                >
                  <span>微信红包</span>
                </div>
              </div>
            </div>

            <div
              v-else
              :class="[
                'relative px-[11px] py-[9px] text-[15px] leading-[22px] rounded-[6px] max-w-[240px] break-words shadow-[0_1px_1px_rgba(0,0,0,0.05)] outline-none cursor-text'
              ]"
              :style="getBubbleStyle(msg.isMe)"
              contenteditable
              @input="markEdited"
              @blur="saveEdit($event, msg.id, 'content')"
              @paste="handlePaste"
            >
              {{ msg.content }}

              <!-- 小尖角图标 -->
              <div
                :class="[
                  'absolute top-[13px] w-0 h-0 border-[6px]',
                  msg.isMe ? 'right-[-5px]' : 'left-[-5px]'
                ]"
                :style="getArrowStyle(msg.isMe)"
              ></div>
            </div>
            <button
              @click="onRemoveMessageClick(msg.id)"
              class="absolute -top-2 -right-2 px-2 py-1 rounded-md text-[10px] text-white/70 bg-black/60 hover:bg-red-500/80 hover:text-red-100 opacity-0 group-hover/msg:opacity-100 transition-all duration-200"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.system-name) {
  color: v-bind('getSystemNameColor');
  font-size: v-bind('chatStore.nicknameSize + "px"');
  font-family: v-bind('chatStore.nicknameFont');
  font-weight: 500;
}

:deep(.system-link) {
  color: #576b95;
  cursor: pointer;
}
</style>
