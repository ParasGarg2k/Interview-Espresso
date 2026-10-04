let worker
let nextRequestId = 0
const pendingRequests = new Map()

function getWorker(onProgress) {
  if (!worker) {
    worker = new Worker(new URL('./model.worker.js', import.meta.url), {
      type: 'module',
    })

    worker.addEventListener('message', (event) => {
      if (event.data.type === 'progress') {
        onProgress?.(event.data.progress)
        return
      }

      const request = pendingRequests.get(event.data.id)
      if (!request) return

      pendingRequests.delete(event.data.id)
      if (event.data.type === 'error') {
        request.reject(new Error(event.data.message))
      } else {
        request.resolve(event.data.text)
      }
    })

    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'The model worker stopped unexpectedly.')
      pendingRequests.forEach(({ reject }) => reject(error))
      pendingRequests.clear()
      worker.terminate()
      worker = undefined
    })
  }

  return worker
}

export function runOpenModel(prompt, { maxNewTokens, onProgress } = {}) {
  const id = ++nextRequestId
  const modelWorker = getWorker(onProgress)

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject })
    modelWorker.postMessage({ id, prompt, maxNewTokens })
  })
}
