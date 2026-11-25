import { trackUsage } from '../utils/analytics'
import { ref, onBeforeUnmount } from 'vue'
import { toCanvas } from 'html-to-image'
import JSZip from 'jszip'
import { localDB } from '../utils/localdb'
import { useChatStore } from '../stores/chat'

interface QueueItem {
  id: string
  blob: Blob
  url: string
}

/**
 * 封装截图导出逻辑，使用全局 window.$message 进行提示
 */
export function useExport() {
  const chatStore = useChatStore()
  const isDownloading = ref(false)
  const exportIndex = ref(0)
  const queue = ref<QueueItem[]>([])
  const isQueueing = ref(false)

  const restoreQueue = async () => {
    try {
      const items = await localDB.getAllPreviewQueueItems()
      queue.value = items.map(item => {
        const url = URL.createObjectURL(item.blob)
        return { id: item.id, blob: item.blob, url }
      })
    } catch (e) {
      console.error('预览队列恢复失败', e)
      window.$message.error('预览队列恢复失败')
    }
  }

  localDB.init().then(() => restoreQueue()).catch(() => {})

  const triggerDownload = (name: string, blob: Blob) => {
    const link = document.createElement('a')
    link.download = name
    link.href = URL.createObjectURL(blob)
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    trackUsage('image.export')
    setTimeout(() => {
      link.remove()
      URL.revokeObjectURL(link.href)
    }, 100)
  }

  const capturePreviewBlob = async () => {
    const element = document.getElementById('wechat-screen')
    const header = document.getElementById('wechat-titlebar')
    if (!element) {
      window.$message.error('未找到截图区域，无法导出')
      return null
    }

    try {
      const fullCanvas = await toCanvas(element, {
        cacheBust: true,
        backgroundColor: '#ededed',
        pixelRatio: 2,
        skipAutoScale: true
      })

      const scale = fullCanvas.width / element.offsetWidth
      const cropWidth = element.offsetWidth
      // 保留状态栏时从屏幕最顶端裁（真截图就是这样的，含时间/信号/电量）
      const cropTop = chatStore.keepStatusBar ? 0 : (header ? Math.max(0, header.offsetTop + 6) : 0)
      const fullHeight = element.offsetHeight
      const availableHeight = Math.max(0, fullHeight - cropTop)
      const exportRatio = chatStore.exportRatio
      const targetHeight = exportRatio === '3:4'
        ? Math.round(cropWidth * 4 / 3)
        : exportRatio === '1:3'
          ? Math.round(cropWidth * 3)
          : availableHeight
      const exportHeight = exportRatio === 'full'
        ? availableHeight
        : Math.min(targetHeight, availableHeight)

      const cropCanvas = document.createElement('canvas')
      cropCanvas.width = Math.round(cropWidth * scale)
      cropCanvas.height = Math.round(exportHeight * scale)
      const ctx = cropCanvas.getContext('2d')
      if (!ctx) throw new Error('Canvas Context 创建失败')

      ctx.drawImage(
        fullCanvas,
        0,
        cropTop * scale,
        cropWidth * scale,
        exportHeight * scale,
        0,
        0,
        cropWidth * scale,
        exportHeight * scale
      )

      return await new Promise<Blob | null>((resolve) => {
        cropCanvas.toBlob((blob) => resolve(blob), 'image/png')
      })
    } catch (err) {
      console.error('渲染失败:', err)
      window.$message.error('渲染失败，请重试')
      return null
    }
  }

  const handleQuickDownload = async () => {
    const blob = await capturePreviewBlob()
    if (!blob) {
      window.$message.error('导出失败，请重试')
      return
    }
    triggerDownload(`wechat-preview-${Date.now()}.png`, blob)
    window.$message.success('预览图导出成功')
  }

  const addToQueue = async () => {
    if (isQueueing.value) return
    isQueueing.value = true
    const blob = await capturePreviewBlob()
    if (!blob) {
      window.$message.error('加入队列失败，请重试')
      isQueueing.value = false
      return
    }
    const id = `queue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const url = URL.createObjectURL(blob)
    queue.value.push({ id, blob, url })
    try {
      await localDB.savePreviewQueueItem({ id, blob, created_at: new Date() })
    } catch (e) {
      console.error('队列持久化失败', e)
      window.$message.error('队列持久化失败，刷新后会丢失')
    }
    window.$message.success('已加入待下载队列')
    isQueueing.value = false
  }

  const removeFromQueue = (id: string) => {
    const index = queue.value.findIndex(item => item.id === id)
    if (index === -1) return
    const target = queue.value[index]
    if (!target) return
    URL.revokeObjectURL(target.url)
    queue.value.splice(index, 1)
    localDB.deletePreviewQueueItem(id).catch((e) => {
      console.error('队列删除失败', e)
      window.$message.error('队列删除失败')
    })
  }

  const clearQueue = () => {
    queue.value.forEach(item => URL.revokeObjectURL(item.url))
    queue.value = []
    localDB.clearPreviewQueue().catch((e) => {
      console.error('队列清空失败', e)
      window.$message.error('队列清空失败')
    })
  }

  const handleBatchDownload = async () => {
    if (isDownloading.value) return
    if (queue.value.length === 0) return
    isDownloading.value = true
    
    try {
      exportIndex.value = 0
      const zip = new JSZip()
      const timestamp = Date.now()
      queue.value.forEach((item, index) => {
        exportIndex.value = index + 1
        zip.file(`wechat-queue-${timestamp}-${index + 1}.png`, item.blob)
      })

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      triggerDownload(`wechat-gen-${Date.now()}.zip`, zipBlob)
      window.$message.success('批量导出完成')
    } catch (e) {
      window.$message.error('批量导出失败')
    } finally {
      isDownloading.value = false
      exportIndex.value = 0
    }
  }

  onBeforeUnmount(() => {
    queue.value.forEach(item => URL.revokeObjectURL(item.url))
  })

  return {
    isDownloading,
    exportIndex,
    queue,
    isQueueing,
    handleQuickDownload,
    addToQueue,
    removeFromQueue,
    clearQueue,
    handleBatchDownload
  }
}
