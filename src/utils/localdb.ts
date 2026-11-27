import { DB_STORES, type ChatMessage, type ChatSession, type PreviewQueueItem, type AvatarItem, type MomentsSession, type XhsSession } from '../types/database'

const DB_NAME = 'wechat_gen_db'
const DB_VERSION = 9 // 升级版本以增加小红书模式
const STORE_CORPUS = DB_STORES.CORPUS
const STORE_NICKNAMES = DB_STORES.NICKNAMES
const STORE_CHAT = DB_STORES.CHAT_HISTORY
const STORE_PREVIEW_QUEUE = DB_STORES.PREVIEW_QUEUE
const STORE_AVATARS = DB_STORES.AVATARS
const STORE_CHAT_LIST = DB_STORES.CHAT_LIST
const STORE_MOMENTS = DB_STORES.MOMENTS
const STORE_XHS = DB_STORES.XHS
const STORE_RESOURCES = 'resources' // 新增图片资源表

class LocalDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      
      request.onerror = () => reject('本地数据库打开失败')
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains(STORE_CORPUS)) {
          const store = db.createObjectStore(STORE_CORPUS, { keyPath: 'id', autoIncrement: true })
          store.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_NICKNAMES)) {
          const store = db.createObjectStore(STORE_NICKNAMES, { keyPath: 'id', autoIncrement: true })
          store.createIndex('type', 'type', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORE_CHAT)) {
          db.createObjectStore(STORE_CHAT, { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains(STORE_PREVIEW_QUEUE)) {
          db.createObjectStore(STORE_PREVIEW_QUEUE, { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains(STORE_AVATARS)) {
          db.createObjectStore(STORE_AVATARS, { keyPath: 'id' })
        }

        // 新增资源库：存储 File/Blob 对象
        if (!db.objectStoreNames.contains(STORE_RESOURCES)) {
          db.createObjectStore(STORE_RESOURCES, { keyPath: 'id' })
        }

        // 新增群聊列表存储
        if (!db.objectStoreNames.contains(STORE_CHAT_LIST)) {
          db.createObjectStore(STORE_CHAT_LIST, { keyPath: 'key' })
        }

        // 新增朋友圈存储
        if (!db.objectStoreNames.contains(STORE_MOMENTS)) {
          db.createObjectStore(STORE_MOMENTS, { keyPath: 'key' })
        }

        // 新增小红书存储
        if (!db.objectStoreNames.contains(STORE_XHS)) {
          db.createObjectStore(STORE_XHS, { keyPath: 'key' })
        }
      }
      
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve()
      }
    })
  }

  private async getDB(): Promise<IDBDatabase> {
    if (!this.db) await this.init()
    if (!this.db) throw new Error('数据库未初始化')
    return this.db
  }

  // --- 资源存储 API (处理 Blob) ---

  async saveResource(id: string, blob: Blob | File): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RESOURCES, 'readwrite')
      tx.objectStore(STORE_RESOURCES).put({ id, blob })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getResource(id: string): Promise<Blob | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RESOURCES, 'readonly')
      const req = tx.objectStore(STORE_RESOURCES).get(id)
      req.onsuccess = () => resolve(req.result?.blob || null)
      req.onerror = () => reject(req.error)
    })
  }

  // --- 头像库 API ---

  async getAllAvatars(): Promise<AvatarItem[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AVATARS, 'readonly')
      const req = tx.objectStore(STORE_AVATARS).getAll()
      req.onsuccess = () => resolve(req.result as AvatarItem[])
      req.onerror = () => reject(req.error)
    })
  }

  async saveAvatar(item: AvatarItem): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AVATARS, 'readwrite')
      tx.objectStore(STORE_AVATARS).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async deleteAvatar(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AVATARS, 'readwrite')
      tx.objectStore(STORE_AVATARS).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clearAvatars(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AVATARS, 'readwrite')
      tx.objectStore(STORE_AVATARS).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // --- 语料库 API ---

  async getAll<T>(): Promise<T[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CORPUS, 'readonly')
      const req = tx.objectStore(STORE_CORPUS).getAll()
      req.onsuccess = () => resolve(req.result as T[])
      req.onerror = () => reject(req.error)
    })
  }

  async add(item: any): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CORPUS, 'readwrite')
      tx.objectStore(STORE_CORPUS).add(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async delete(id: number): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CORPUS, 'readwrite')
      tx.objectStore(STORE_CORPUS).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clear(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CORPUS, 'readwrite')
      tx.objectStore(STORE_CORPUS).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // --- 昵称库 API ---

  async getAllNicknames(): Promise<any[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NICKNAMES, 'readonly')
      const req = tx.objectStore(STORE_NICKNAMES).getAll()
      req.onsuccess = () => resolve(req.result as any[])
      req.onerror = () => reject(req.error)
    })
  }

  async addNickname(item: any): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NICKNAMES, 'readwrite')
      tx.objectStore(STORE_NICKNAMES).add(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async deleteNickname(id: number): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NICKNAMES, 'readwrite')
      tx.objectStore(STORE_NICKNAMES).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clearNicknames(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NICKNAMES, 'readwrite')
      tx.objectStore(STORE_NICKNAMES).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // --- 聊天记录 API ---

  async saveChatSession(data: ChatSession, changes: Partial<ChatSession>): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readwrite')
      const store = tx.objectStore(STORE_CHAT)
      const record = store.get(data.key)
      record.onsuccess = () => {
        const existing = record.result as ChatSession | undefined
        store.put({ ...(existing ?? data), ...changes, updated_at: data.updated_at })
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async loadChatSession(): Promise<ChatSession | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT, 'readonly')
      const req = tx.objectStore(STORE_CHAT).get('current')
      req.onsuccess = () => resolve(req.result as ChatSession || null)
      req.onerror = () => reject(req.error)
    })
  }

  async saveJoinMessages(messages: ChatMessage[]): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHAT, 'readwrite')
      transaction.objectStore(STORE_CHAT).put({ key: 'join', messages, updated_at: new Date() })
      transaction.oncomplete = () => resolve()
      transaction.onabort = () => reject(transaction.error)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async loadJoinMessages(): Promise<ChatMessage[] | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE_CHAT, 'readonly').objectStore(STORE_CHAT).get('join')
      request.onsuccess = () => resolve(request.result?.messages ?? null)
      request.onerror = () => reject(request.error)
    })
  }

  // --- 预览队列 API ---

  async savePreviewQueueItem(item: PreviewQueueItem): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREVIEW_QUEUE, 'readwrite')
      tx.objectStore(STORE_PREVIEW_QUEUE).put(item)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getAllPreviewQueueItems(): Promise<PreviewQueueItem[]> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREVIEW_QUEUE, 'readonly')
      const req = tx.objectStore(STORE_PREVIEW_QUEUE).getAll()
      req.onsuccess = () => resolve(req.result as PreviewQueueItem[])
      req.onerror = () => reject(req.error)
    })
  }

  async deletePreviewQueueItem(id: string): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREVIEW_QUEUE, 'readwrite')
      tx.objectStore(STORE_PREVIEW_QUEUE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clearPreviewQueue(): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PREVIEW_QUEUE, 'readwrite')
      tx.objectStore(STORE_PREVIEW_QUEUE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  // --- 群聊列表 API ---

  async saveChatListSession(data: { key?: string, config: any, items: any[], updated_at: Date }): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT_LIST, 'readwrite')
      tx.objectStore(STORE_CHAT_LIST).put({ ...data, key: 'current' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async loadChatListSession(): Promise<{ config: any, items: any[] } | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CHAT_LIST, 'readonly')
      const req = tx.objectStore(STORE_CHAT_LIST).get('current')
      req.onsuccess = () => {
        const result = req.result
        if (result) {
          resolve({ config: result.config, items: result.items })
        } else {
          resolve(null)
        }
      }
      req.onerror = () => reject(req.error)
    })
  }

  // --- 朋友圈 API ---

  async saveMomentsSession(data: MomentsSession): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MOMENTS, 'readwrite')
      tx.objectStore(STORE_MOMENTS).put({ ...data, key: 'current' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async loadMomentsSession(): Promise<MomentsSession | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MOMENTS, 'readonly')
      const req = tx.objectStore(STORE_MOMENTS).get('current')
      req.onsuccess = () => resolve((req.result as MomentsSession) || null)
      req.onerror = () => reject(req.error)
    })
  }

  // --- 小红书 API ---

  async saveXhsSession(data: XhsSession): Promise<void> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_XHS, 'readwrite')
      tx.objectStore(STORE_XHS).put({ ...data, key: 'current' })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async loadXhsSession(): Promise<XhsSession | null> {
    const db = await this.getDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_XHS, 'readonly')
      const req = tx.objectStore(STORE_XHS).get('current')
      req.onsuccess = () => resolve((req.result as XhsSession) || null)
      req.onerror = () => reject(tx.error)
    })
  }
}

export const localDB = new LocalDB()
