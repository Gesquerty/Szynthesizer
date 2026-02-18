class AudioRateLimiter extends AudioWorkletProcessor {
  constructor() {
    super();

    // Parameters
    this.threshold = 0.3;  
    this.attack = 0.002;    
    this.release = 0.05;  
    this.gain = 1.0;
  }

  process(inputs, outputs) {

    const input = inputs[0];
    const output = outputs[0];

    //saftey first
    if (!input || !input[0]) return true;

    const x = input[0];
    const y = output[0];
    const attackCoeff = Math.exp(-1 / (sampleRate * this.attack));
    const releaseCoeff =  Math.exp(-1 / (sampleRate * this.release));

    for (let i = 0; i < x.length; i++) {
      const abs = Math.abs(x[i]);

      let targetGain = 1.0;
      if (abs > this.threshold) {
        targetGain = this.threshold / abs;
      }

      //smooth ouput
      const coeff =
        targetGain < this.gain ? attackCoeff : releaseCoeff;

      this.gain = coeff * this.gain + (1 - coeff) * targetGain;


      y[i] = x[i] * this.gain;
    }

    return true;
  }
}

registerProcessor("compressor", AudioRateLimiter);