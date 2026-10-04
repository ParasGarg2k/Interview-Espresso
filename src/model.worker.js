import { env, pipeline } from '@huggingface/transformers'

env.allowLocalModels = false
env.useBrowserCache = true

const MODEL_ID = 'onnx-community/SmolLM2-360M-Instruct-ONNX'
let generatorPromise

function getGenerator() {
  if (!generatorPromise) {
    generatorPromise = pipeline('text-generation', MODEL_ID, {
      device: 'wasm',
      dtype: 'q4',
      progress_callback: (progress) => {
        self.postMessage({ type: 'progress', progress })
      },
    })
  }

  return generatorPromise
}

self.addEventListener('message', async (event) => {
  const { id, prompt, maxNewTokens = 220 } = event.data

  try {
    const generator = await getGenerator()
    const result = await generator([
      {
        role: 'system',
        content: 'You are Interview Espresso, a concise and evidence-based interview coach.',
      },
      { role: 'user', content: prompt },
    ], {
      max_new_tokens: maxNewTokens,
      do_sample: true,
      temperature: 0.65,
      repetition_penalty: 1.08,
    })
    const generated = result[0]?.generated_text
    const text = Array.isArray(generated)
      ? generated.findLast((message) => message.role === 'assistant')?.content
      : generated

    self.postMessage({
      id,
      type: 'result',
      text: text?.trim() ?? '',
    })
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      message: error instanceof Error ? error.message : 'The model could not run.',
    })
  }
})
