import type { ExportRatio } from '../types/database'

export function getCaptureBounds(screen: HTMLElement, header: HTMLElement | null, ratio: ExportRatio, keepStatusBar: boolean) {
  const width = screen.clientWidth
  const fullHeight = screen.clientHeight
  const screenRect = screen.getBoundingClientRect()
  const scale = screenRect.height / (fullHeight || 1)
  const top = !keepStatusBar && header && scale > 0
    ? Math.min(fullHeight, Math.max(0, Math.round((header.getBoundingClientRect().top - screenRect.top) / scale)))
    : 0
  const available = fullHeight - top
  const scrollArea = screen.querySelector<HTMLElement>('[data-export-scroll]')
  const overflow = scrollArea ? Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight) : 0
  const height = ratio === '3:4' ? Math.round(width * 4 / 3) : ratio === '1:3' ? width * 3 : available + overflow
  return { width, top, height, visibleHeight: Math.min(height, available), renderHeight: Math.max(fullHeight, top + height) }
}
