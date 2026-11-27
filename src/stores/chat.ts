import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useCorpusStore } from './corpus'
import { localDB } from '../utils/localdb'
import { PRESET_DIALOGUES, PRESET_NAMES, PRESET_SYSTEMS } from '../config/presets'
import { useAvatarStore } from './avatar'
import { randomAvatarService } from '../utils/randomAvatar'
import { type ChatMessage, type DeviceType, type StatusBarTheme, type PreviewTheme, type ExportRatio, type ChatSession } from '../types/database'
import defaultBg from '../assets/bg.jpg'

export type { ChatMessage as Message, DeviceType, StatusBarTheme, PreviewTheme, ExportRatio }

type SessionField = keyof Omit<ChatSession, 'key' | 'updated_at'>
const sharedSettings = ['groupTitle', 'memberCount', 'exportRatio', 'isGroupChat', 'keepStatusBar', 'statusBarTime'] as const

export const useChatStore = defineStore('chat', {
  state: () => ({
    groupTitle: '演唱会粉丝交流群',
    memberCount: 188,
    nicknameColor: '#adadad',
    nicknameSize: 11,
    nicknameFont: 'sans-serif',
    systemBgColor: '', // 将在 init 或 getter 中动态处理
    systemNameColor: '', 
    isHighlightingCapture: false,
    backgroundImage: defaultBg, // 这里保持引用链接，只有用户上传的存 Blob
    exportRatio: 'full' as ExportRatio,
    deviceType: 'ios' as DeviceType,
    statusBarTheme: 'dark' as StatusBarTheme,
    statusBarTime: '23:30',
    previewTheme: (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') as PreviewTheme,
    currentUser: { name: '我', avatar: '' },
    isGroupChat: true,     // 群聊形态：标题显示 (人数)、消息显示昵称；关掉 = 单聊形态
    keepStatusBar: true,   // 导出时保留顶部状态栏（时间/信号/电量），真截图有
    messages: [] as ChatMessage[],
    joinMessages: null as ChatMessage[] | null,
    messageMode: 'chat' as 'chat' | 'join',
    initialized: false
  }),
  getters: {
    activeMessages: (state): ChatMessage[] => state.messageMode === 'join'
      ? state.joinMessages ?? []
      : state.messages
  },
  actions: {
    /**
     * 初始化：加载保存的会话，还原图片资源，并启动联动监听
     */
    async init() {
      this.messageMode = 'chat'
      if (this.initialized) return
      const avatarStore = useAvatarStore()

      // 1. 系统主题监听 (全局)
      const themeMedia = window.matchMedia('(prefers-color-scheme: dark)')
      themeMedia.addEventListener('change', (e) => {
        this.previewTheme = e.matches ? 'dark' : 'light'
      })

      // 2. 内部逻辑联动：预览主题 -> 状态栏主题
      watch(() => this.previewTheme, (newTheme) => {
        this.statusBarTheme = newTheme === 'dark' ? 'light' : 'dark'
      }, { immediate: true })

      try {
        await avatarStore.init()
        const saved = await localDB.loadChatSession() as ChatSession
        if (saved) {
          this.groupTitle = saved.groupTitle ?? this.groupTitle
          this.memberCount = saved.memberCount ?? this.memberCount
          this.messages = saved.messages ?? []
          this.currentUser = saved.currentUser ?? this.currentUser
          this.exportRatio = saved.exportRatio ?? this.exportRatio
          this.isGroupChat = saved.isGroupChat ?? this.isGroupChat
          this.keepStatusBar = saved.keepStatusBar ?? this.keepStatusBar
          this.statusBarTime = saved.statusBarTime ?? this.statusBarTime
          
          // 处理背景图：如果是资源 ID，从 localDB 加载 Blob
          if (saved.backgroundImage?.startsWith('res:')) {
            const blob = await localDB.getResource(saved.backgroundImage)
            if (blob) this.backgroundImage = URL.createObjectURL(blob)
          } else {
            this.backgroundImage = saved.backgroundImage ?? defaultBg
          }

          // 处理头像：同上
          if (this.currentUser.avatar?.startsWith('res:')) {
            const blob = await localDB.getResource(this.currentUser.avatar)
            if (blob) this.currentUser.avatar = URL.createObjectURL(blob)
          }
        }

        if (!saved) {
          this.batchAddRandomDialog(10, false)
        }
      } catch (e) {
        console.error('加载聊天会话失败', e)
      }
      this.initialized = true
      watch(() => sharedSettings.map(field => this[field]), (next, previous) => {
        const changed = sharedSettings.filter((_, index) => next[index] !== previous[index])
        if (changed.length) void this.save(changed)
      })
    },

    async save(fields?: readonly SessionField[]) {
      try {
        if (!fields && this.messageMode === 'join') {
          await localDB.saveJoinMessages(JSON.parse(JSON.stringify(this.activeMessages)))
          return
        }
        const sessionData: Omit<ChatSession, 'updated_at'> = {
          key: 'current',
          groupTitle: this.groupTitle,
          memberCount: this.memberCount,
          backgroundImage: this.backgroundImage,
          exportRatio: this.exportRatio,
          isGroupChat: this.isGroupChat,
          keepStatusBar: this.keepStatusBar,
          statusBarTime: this.statusBarTime,
          messages: JSON.parse(JSON.stringify(this.messages)),
          currentUser: JSON.parse(JSON.stringify(this.currentUser))
        }
        const changed = fields ?? ['messages'] as const
        const patch = Object.fromEntries(changed.map(field => [field, sessionData[field]]))
        await localDB.saveChatSession({
          ...sessionData,
          updated_at: new Date()
        }, patch)
      } catch (e) {
        console.error('保存聊天会话失败', e)
      }
    },

    /**
     * 设置背景图：存入独立资源库，避免主表膨胀
     */
    async setBg(file: File | string) {
      if (typeof file === 'string') {
        this.backgroundImage = file
      } else {
        const id = `res:bg_${Date.now()}`
        await localDB.saveResource(id, file)
        if (this.backgroundImage.startsWith('blob:')) URL.revokeObjectURL(this.backgroundImage)
        this.backgroundImage = URL.createObjectURL(file)
        // 在保存会话时，我们存 ID
        // 注意：这里的 save() 会存当前的 URL，init 时需要特殊处理。
        // 为了简化，我们直接在 save 前替换为 ID
      }
      this.save(['backgroundImage'])
    },

    async setCurrentUserAvatar(file: File | string) {
      if (typeof file === 'string') {
        this.currentUser.avatar = file
      } else {
        const id = `res:avatar_${Date.now()}`
        await localDB.saveResource(id, file)
        if (this.currentUser.avatar.startsWith('blob:')) URL.revokeObjectURL(this.currentUser.avatar)
        this.currentUser.avatar = URL.createObjectURL(file)
      }
      this.save(['currentUser'])
    },

    // --- 其他常规 Action ---
    async setMessageMode(mode: 'chat' | 'join') {
      if (mode === 'join' && this.joinMessages === null) {
        const saved = await localDB.loadJoinMessages().catch(() => null)
        this.joinMessages = saved ?? Array.from({ length: 10 }, () => this.makeInviteMessage())
      }
      this.messageMode = mode
    },
    replaceActiveMessages(messages: ChatMessage[]) {
      if (this.messageMode === 'join') this.joinMessages = messages
      else this.messages = messages
      this.save()
    },
    addMessage(msg: ChatMessage) {
      this.activeMessages.push(msg)
      this.save()
    },
    removeMessage(id: string) {
      this.replaceActiveMessages(this.activeMessages.filter(m => m.id !== id))
    },
    clearMessages() {
      this.replaceActiveMessages([])
    },
    updateMessage(id: string, field: 'content' | 'name', value: string) {
      const msg = this.activeMessages.find(m => m.id === id)
      if (!msg) return
      if (field === 'content') {
        if (msg.content === value) return
        msg.content = value
      } else {
        if (!msg.sender || msg.sender.name === value) return
        msg.sender.name = value
      }
      this.save()
    },

    getRandomUser() {
      const name = PRESET_NAMES[Math.floor(Math.random() * PRESET_NAMES.length)] || '用户'

      const randomAvatarEnabled = localStorage.getItem('randomAvatarEnabled') !== 'false'
      if (randomAvatarEnabled) {
        const avatar = randomAvatarService.generateRandomAvatar()
        return { name, avatar }
      }

      const avatarStore = useAvatarStore()
      const avatarPool = avatarStore.customAvatars.length
        ? avatarStore.customAvatars.map(item => item.url)
        : ['']
      const avatar = avatarPool[Math.floor(Math.random() * avatarPool.length)] || ''
      return { name, avatar: avatar }
    },

    batchAddMessages(lines: string[]) {
      lines.forEach(line => {
        if (!line.trim()) return
        const parts = line.split(/[:：]/)
        let sender = this.getRandomUser()
        let content = line
        let isMe = false

        if (parts.length > 1) {
          const namePart = parts[0]
          if (namePart) {
            const name = namePart.trim()
            const currentName = this.currentUser.name || '我'
            content = parts.slice(1).join(':').trim()
            if (name === 'Me' || name === '我' || name === currentName) {
              isMe = true
              sender = { name: currentName, avatar: this.currentUser.avatar }
            } else {
              sender = { name, avatar: '' }
            }
          }
        }

        this.activeMessages.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          content,
          sender,
          isMe
        })
      })
      this.save()
    },

    addSystemMessage(content: string) {
      this.activeMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'system',
        content
      })
      this.save()
    },

    makeInviteMessage(): ChatMessage {
      const inviter = this.getRandomUser()
      const invited = this.getRandomUser()
      const other = this.getRandomUser()
      const template = PRESET_SYSTEMS[Math.floor(Math.random() * PRESET_SYSTEMS.length)] || '{inviter} 邀请 {invited} 加入了群聊'
      const content = template
        .replace(/{inviter}/g, `<span class="system-name">${inviter.name}</span>`)
        .replace(/{invited}/g, `<span class="system-name">${invited.name}</span>`)
        .replace(/{other}/g, `<span class="system-name">${other.name}</span>`)
        .replace(/{groupName}/g, `<span class="system-name">${this.groupTitle}</span>`)

      return { id: Math.random().toString(36).slice(2), type: 'system', content }
    },

    addInviteSystemMessage() {
      this.addMessage(this.makeInviteMessage())
    },

    addRedPacketSystemMessage(senderName?: string) {
      let sender
      if (senderName) {
        sender = { name: senderName, avatar: '' }
      } else {
        sender = this.getRandomUser()
      }
      this.activeMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'redpacket',
        content: '恭喜发财，大吉大利',
        sender
      })
      this.save()
    },

    addRedPacketOpenedMessage(receivedBy: string, sentBy?: string) {
      const senderName = sentBy || '我'
      const content = `${receivedBy} 领取了<span class="system-name">${senderName}</span>的<span class="text-[#ffbc42]">红包</span>`
      this.activeMessages.push({
        id: Math.random().toString(36).substr(2, 9),
        type: 'red-packet-opened',
        content
      })
      this.save()
    },

    batchAddJoinMessages(count: number) {
      this.activeMessages.push(...Array.from({ length: count }, () => this.makeInviteMessage()))
      this.save()
    },

    batchAddRandomDialog(count: number, persist = true) {
      const needsAvatar = !this.currentUser.avatar
      if (needsAvatar) {
        const randomMe = this.getRandomUser()
        const currentName = this.currentUser.name || '我'
        this.currentUser = { name: currentName, avatar: randomMe.avatar! }
      }

      const corpusStore = useCorpusStore()
      const corpusDialogues = corpusStore.dialogues.map(item => item.content).filter(Boolean)
      const hypes = corpusDialogues.length ? corpusDialogues : PRESET_DIALOGUES
      
      for (let i = 0; i < count; i++) {
        const isMe = Math.random() > 0.8
        const content = hypes[Math.floor(Math.random() * hypes.length)] || '...'
        const sender = isMe ? this.currentUser : this.getRandomUser() as { name: string; avatar: string }
        
        this.activeMessages.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'text',
          content,
          sender,
          isMe
        })
      }
      if (persist) {
        if (needsAvatar) this.save(['currentUser'])
        this.save()
      }
    }
  }
})
