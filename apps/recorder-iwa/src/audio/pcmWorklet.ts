export function buildWorkletSource(noiseGate: boolean): string {
  return `
class PCMProcessor extends AudioWorkletProcessor {
  constructor () {
    super()
    this._buffer = []
    this._bufferSize = 0
    this._targetSamples = 4000
    this._noiseGate = ${noiseGate ? "true" : "false"}
    this._noiseThreshold = 0.008
    this._silenceFrames = 0
    this._silenceGraceFrames = 3
  }

  process (inputs) {
    const input = inputs[0]
    if (input.length === 0) return true
    const channelData = input[0]
    if (!channelData) return true

    let q = 0
    for (let i = 0; i < channelData.length; i++) {
      q += channelData[i] * channelData[i]
    }
    this.port.postMessage({ level: Math.sqrt(q / channelData.length) })

    for (let i = 0; i < channelData.length; i++) {
      this._buffer.push(channelData[i])
    }
    this._bufferSize += channelData.length

    if (this._bufferSize >= this._targetSamples) {
      const samples = new Float32Array(this._buffer)
      this._buffer = []
      this._bufferSize = 0

      if (!this._noiseGate) {
        this.port.postMessage({ samples })
        return true
      }

      let sumSquares = 0
      for (let i = 0; i < samples.length; i++) {
        sumSquares += samples[i] * samples[i]
      }
      const rms = Math.sqrt(sumSquares / samples.length)

      if (rms > this._noiseThreshold) {
        this._silenceFrames = 0
        this.port.postMessage({ samples })
      } else if (this._silenceFrames < this._silenceGraceFrames) {
        this._silenceFrames++
        this.port.postMessage({ samples })
      }
    }
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
`;
}
