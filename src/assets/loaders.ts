import { assets, type ReadyAsset } from './manifest'
import type { StoryId } from '../content/homepage'

// Small image-only prefetch. Video/model bytes stay with their lazy scene loader.
export function preloadImage(asset: ReadyAsset, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
    const image = new Image()
    const cleanup = () => { image.onload = null; image.onerror = null; signal?.removeEventListener('abort', abort) }
    const abort = () => { cleanup(); image.src = ''; reject(new DOMException('Aborted', 'AbortError')) }
    image.onload = () => { cleanup(); resolve() }
    image.onerror = () => { cleanup(); reject(new Error(`Unable to preload asset: ${asset.id}`)) }
    signal?.addEventListener('abort', abort, { once: true })
    image.decoding = 'async'
    image.src = asset.src
  })
}

export function prefetchSceneImages(scene: StoryId, signal?: AbortSignal) {
  const ready = assets.filter((asset): asset is ReadyAsset => asset.scene === scene && asset.status === 'ready' && asset.kind === 'image')
  return Promise.allSettled(ready.sort((a, b) => a.priority - b.priority).map(asset => preloadImage(asset, signal)))
}
