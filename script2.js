document.addEventListener("DOMContentLoaded", async function(event) {

    const verbose = false;

    //ADSR parameters (made mutable so UI sliders can update them)
    let attackTime = 0.05;
    let attackLevel = 0.8;
    let sustainLevel = 0.5;
    let decayTime = 0.3;
    let releaseTime = 0.3;

    //Notes and keys
    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - G
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - B
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    }

    //Setup for keyboard synth
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const globalGain = audioCtx.createGain(); //Global gain control
    globalGain.gain.setValueAtTime(1.0, audioCtx.currentTime)


    //Add compressor node for clipping and shit -------------------------
    //Note that I orginally tried other methods but since they were all contolr rate, I had to go with an audio rate solution
    await audioCtx.audioWorklet.addModule("compressor.js");
    const compressor = new AudioWorkletNode(audioCtx, "compressor");
    globalGain.connect(compressor);
    compressor.connect(audioCtx.destination);
    //Add compressor node for clipping and shit ^^^^^^^^^^^^^^^^^^^^^^^^^

    //Adding LFO -------------------------
    const oscLFO = audioCtx.createOscillator();
    oscLFO.type = 'sine';
    oscLFO.frequency = 10;
    oscLFO.start();

    const gainLFO = audioCtx.createGain();

    gainLFO.gain.value = 0;

    oscLFO.connect(gainLFO)
    gainLFO.connect(globalGain.gain);
    //Adding LFO ^^^^^^^^^^^^^^^^^^^^^^^^^


    const activeVoices = new Map();
    let keyPressed = {}


    // ------------------ Update all parameters from UI elements ------------------

    // Oscillator waveform, gain, and offset controls
    let selectedWaveform1 = 'sine';
    let selectedWaveform2 = 'sine';
    let selectedWaveform3 = 'sine';
    let selectedWaveform4 = 'sine';
    let selectedWaveform5 = 'sine';
    let selectedWaveform6 = 'sine';
    let osc1Gain = 1.0;
    let osc2Gain = 1.0;
    let osc3Gain = 1.0;
    let osc4Gain = 1.0;
    let osc5Gain = 1.0;
    let osc6Gain = 1.0;
    let osc1Offset = 1.0;
    let osc2Offset = 2.0;
    let osc3Offset = 4.0;
    let osc4Offset = 1.0;
    let osc5Offset = 2.0;
    let osc6Offset = 4.0;

    const waveformSelect1 = document.getElementById('mySelect');
    const waveformSelect2 = document.getElementById('mySelect2');
    const waveformSelect3 = document.getElementById('mySelect3');
    const waveformSelect4 = document.getElementById('mySelect4');
    const waveformSelect5 = document.getElementById('mySelect5');
    const waveformSelect6 = document.getElementById('mySelect6');
    const osc1GainSlider = document.getElementById('osc1-gain');
    const osc2GainSlider = document.getElementById('osc2-gain');
    const osc3GainSlider = document.getElementById('osc3-gain');
    const osc4GainSlider = document.getElementById('osc4-gain');
    const osc5GainSlider = document.getElementById('osc5-gain');
    const osc6GainSlider = document.getElementById('osc6-gain');
    const osc1GainText = document.getElementById('osc1-gain-text');
    const osc2GainText = document.getElementById('osc2-gain-text');
    const osc3GainText = document.getElementById('osc3-gain-text');
    const osc4GainText = document.getElementById('osc4-gain-text');
    const osc5GainText = document.getElementById('osc5-gain-text');
    const osc6GainText = document.getElementById('osc6-gain-text');
    const osc1OffsetSlider = document.getElementById('osc1-offset');
    const osc2OffsetSlider = document.getElementById('osc2-offset');
    const osc3OffsetSlider = document.getElementById('osc3-offset');
    const osc4OffsetSlider = document.getElementById('osc4-offset');
    const osc5OffsetSlider = document.getElementById('osc5-offset');
    const osc6OffsetSlider = document.getElementById('osc6-offset');
    const osc1OffsetText = document.getElementById('osc1-offset-text');
    const osc2OffsetText = document.getElementById('osc2-offset-text');
    const osc3OffsetText = document.getElementById('osc3-offset-text');
    const osc4OffsetText = document.getElementById('osc4-offset-text');
    const osc5OffsetText = document.getElementById('osc5-offset-text');
    const osc6OffsetText = document.getElementById('osc6-offset-text');

    function updateGainText(span, val) {
        if (span) span.textContent = Math.round(val * 100) + '%';
    }
    function updateOffsetText(span, val) {
        if (span) span.textContent = parseFloat(val).toFixed(2);
    }

    if (waveformSelect1) waveformSelect1.addEventListener('change', function() {
        selectedWaveform1 = waveformSelect1.value;
        
        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][0].type = selectedWaveform1;
    });
    if (waveformSelect2) waveformSelect2.addEventListener('change', function() {
        selectedWaveform2 = waveformSelect2.value;

        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][1].type = selectedWaveform2;
    });
    if (waveformSelect3) waveformSelect3.addEventListener('change', function() {
        selectedWaveform3 = waveformSelect3.value;

        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][2].type = selectedWaveform3;
    });
    if (waveformSelect4) waveformSelect4.addEventListener('change', function() {
        selectedWaveform4 = waveformSelect4.value;
        
        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][3].type = selectedWaveform4;
    });
    if (waveformSelect5) waveformSelect5.addEventListener('change', function() {
        selectedWaveform5 = waveformSelect5.value;

        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][4].type = selectedWaveform5;
    });
    if (waveformSelect6) waveformSelect6.addEventListener('change', function() {
        selectedWaveform6 = waveformSelect6.value;

        //Update playing values
        for (let [key, value] of activeVoices) activeVoices.get(key)[0][5].type = selectedWaveform6;
    });

    if (osc1GainSlider) {
        osc1Gain = parseFloat(osc1GainSlider.value);
        updateGainText(osc1GainText, osc1Gain);
        osc1GainSlider.addEventListener('input', e => {
            osc1Gain = parseFloat(e.target.value);
            updateGainText(osc1GainText, osc1Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }x
        });
    }
    if (osc2GainSlider) {
        osc2Gain = parseFloat(osc2GainSlider.value);
        updateGainText(osc2GainText, osc2Gain);
        osc2GainSlider.addEventListener('input', e => {
            osc2Gain = parseFloat(e.target.value);
            updateGainText(osc2GainText, osc2Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }
        });
    }
    if (osc3GainSlider) {
        osc3Gain = parseFloat(osc3GainSlider.value);
        updateGainText(osc3GainText, osc3Gain);
        osc3GainSlider.addEventListener('input', e => {
            osc3Gain = parseFloat(e.target.value);
            updateGainText(osc3GainText, osc3Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }
        });
    }

    if (osc4GainSlider) {
        osc4Gain = parseFloat(osc4GainSlider.value);
        updateGainText(osc4GainText, osc4Gain);
        osc4GainSlider.addEventListener('input', e => {
            osc4Gain = parseFloat(e.target.value);
            updateGainText(osc4GainText, osc4Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }
        });
    }
    if (osc5GainSlider) {
        osc5Gain = parseFloat(osc5GainSlider.value);
        updateGainText(osc5GainText, osc5Gain);
        osc5GainSlider.addEventListener('input', e => {
            osc5Gain = parseFloat(e.target.value);
            updateGainText(osc5GainText, osc5Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }
        });
    }
    if (osc6GainSlider) {
        osc6Gain = parseFloat(osc6GainSlider.value);
        updateGainText(osc6GainText, osc6Gain);
        osc6GainSlider.addEventListener('input', e => {
            osc6Gain = parseFloat(e.target.value);
            updateGainText(osc6GainText, osc6Gain);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
                activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
            }
        });
    }

    if (osc1OffsetSlider) {
        osc1Offset = parseFloat(osc1OffsetSlider.value);
        updateOffsetText(osc1OffsetText, osc1Offset);
        osc1OffsetSlider.addEventListener('input', e => {
            osc1Offset = parseFloat(e.target.value);
            updateOffsetText(osc1OffsetText, osc1Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][0].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc1Offset, audioCtx.currentTime, 0.1);
        });
    }
    if (osc2OffsetSlider) {
        osc2Offset = parseFloat(osc2OffsetSlider.value);
        updateOffsetText(osc2OffsetText, osc2Offset);
        osc2OffsetSlider.addEventListener('input', e => {
            osc2Offset = parseFloat(e.target.value);
            updateOffsetText(osc2OffsetText, osc2Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][1].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc2Offset + Math.random() * 15, audioCtx.currentTime, 0.1);
        });
    }
    if (osc3OffsetSlider) {
        osc3Offset = parseFloat(osc3OffsetSlider.value);
        updateOffsetText(osc3OffsetText, osc3Offset);
        osc3OffsetSlider.addEventListener('input', e => {
            osc3Offset = parseFloat(e.target.value);
            updateOffsetText(osc3OffsetText, osc3Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][2].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc3Offset + Math.random() * 15, audioCtx.currentTime, 0.1);
        });
    }

    if (osc4OffsetSlider) {
        osc4Offset = parseFloat(osc4OffsetSlider.value);
        updateOffsetText(osc4OffsetText, osc4Offset);
        osc4OffsetSlider.addEventListener('input', e => {
            osc4Offset = parseFloat(e.target.value);
            updateOffsetText(osc4OffsetText, osc4Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][3].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc4Offset + Math.random() * 15, audioCtx.currentTime, 0.1);
        });
    }
    if (osc5OffsetSlider) {
        osc5Offset = parseFloat(osc5OffsetSlider.value);
        updateOffsetText(osc5OffsetText, osc5Offset);
        osc5OffsetSlider.addEventListener('input', e => {
            osc5Offset = parseFloat(e.target.value);
            updateOffsetText(osc5OffsetText, osc5Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][4].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc5Offset + Math.random() * 15, audioCtx.currentTime, 0.1);
        });
    }
    if (osc6OffsetSlider) {
        osc6Offset = parseFloat(osc6OffsetSlider.value);
        updateOffsetText(osc6OffsetText, osc6Offset);
        osc6OffsetSlider.addEventListener('input', e => {
            osc6Offset = parseFloat(e.target.value);
            updateOffsetText(osc6OffsetText, osc6Offset);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[0][5].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc6Offset + Math.random() * 15, audioCtx.currentTime, 0.1);
        });
    }

    /*
    //Get waveform type from dropdown
    let selectedWaveform = 'sine'; //default
    const waveformSelect = document.getElementById('mySelect');
    waveformSelect.addEventListener('change', function() {
        selectedWaveform = waveformSelect.value;
        console.log("Selected waveform: " + selectedWaveform);
    });*/

    // Frequency mode switch variable
    //let frequencyMode = false;
    /*
    const freqSwitch = document.getElementById('freq-mode-switch');
    if (freqSwitch) {
        freqSwitch.addEventListener('change', function() {
            frequencyMode = freqSwitch.checked;

            //Switch starting frequency on and off
            if (frequencyMode) {
                GainFreq.gain.setTargetAtTime(freqValue, audioCtx.currentTime, 0.01);
                console.log("Frequency mode ON");
            } else {
                GainFreq.gain.setTargetAtTime(0, audioCtx.currentTime, releaseTime);
                console.log("Frequency mode OFF");
            }
        });
    }*/

    // Wire ADSR sliders (if present in the DOM)
    const attackTimeSlider = document.getElementById('attack-time');
    const attackLevelSlider = document.getElementById('attack-level');
    const sustainLevelSlider = document.getElementById('sustain-level');
    const decayTimeSlider = document.getElementById('decay-time');
    const releaseTimeSlider = document.getElementById('release-time');

    const attackTimeText = document.getElementById('attack-time-text');
    const attackLevelText = document.getElementById('attack-level-text');
    const sustainLevelText = document.getElementById('sustain-level-text');
    const decayTimeText = document.getElementById('decay-time-text');
    const releaseTimeText = document.getElementById('release-time-text');

    function fmtTime(v) { return parseFloat(v).toFixed(2) + 's'; }
    function fmtPct(v) { return Math.round(parseFloat(v) * 100) + '%'; }

    if (attackTimeSlider) {
        attackTime = parseFloat(attackTimeSlider.value);
        if (attackTimeText) attackTimeText.textContent = fmtTime(attackTime);
        attackTimeSlider.addEventListener('input', (e) => {
            attackTime = parseFloat(e.target.value);
            if (attackTimeText) attackTimeText.textContent = fmtTime(attackTime);
        });
    }
    if (attackLevelSlider) {
        attackLevel = parseFloat(attackLevelSlider.value);
        if (attackLevelText) attackLevelText.textContent = fmtPct(attackLevel);
        attackLevelSlider.addEventListener('input', (e) => {
            attackLevel = parseFloat(e.target.value);
            if (attackLevelText) attackLevelText.textContent = fmtPct(attackLevel);
        });
    }
    if (sustainLevelSlider) {
        sustainLevel = parseFloat(sustainLevelSlider.value);
        if (sustainLevelText) sustainLevelText.textContent = fmtPct(sustainLevel);
        sustainLevelSlider.addEventListener('input', (e) => {
            sustainLevel = parseFloat(e.target.value);
            if (sustainLevelText) sustainLevelText.textContent = fmtPct(sustainLevel);
        });
    }
    if (decayTimeSlider) {
        decayTime = parseFloat(decayTimeSlider.value);
        if (decayTimeText) decayTimeText.textContent = fmtTime(decayTime);
        decayTimeSlider.addEventListener('input', (e) => {
            decayTime = parseFloat(e.target.value);
            if (decayTimeText) decayTimeText.textContent = fmtTime(decayTime);
        });
    }
    if (releaseTimeSlider) {
        releaseTime = parseFloat(releaseTimeSlider.value);
        if (releaseTimeText) releaseTimeText.textContent = fmtTime(releaseTime);
        releaseTimeSlider.addEventListener('input', (e) => {
            releaseTime = parseFloat(e.target.value);
            if (releaseTimeText) releaseTimeText.textContent = fmtTime(releaseTime);
        });
    }

    // Amplitude modulation parameter
    let depthAM = 0.0;
    const amDepthSlider = document.getElementById('am-depth');
    const amDepthText = document.getElementById('am-depth-text');
    function updateAMText(val) {
        if (amDepthText) amDepthText.textContent = Math.round(val * 100) + '%';
    }
    if (amDepthSlider) {
        depthAM = parseFloat(amDepthSlider.value);
        updateAMText(depthAM);
        amDepthSlider.addEventListener('input', e => {
            depthAM = parseFloat(e.target.value);
            updateAMText(depthAM);

            //Update playing values
            for (let [key, value] of activeVoices) {
                activeVoices.get(key)[3][1].gain.setTargetAtTime(depthAM, audioCtx.currentTime, 0.1);
                activeVoices.get(key)[3][2].gain.setTargetAtTime(1.0 - activeVoices.get(key)[3][1].gain.value, audioCtx.currentTime, 0.1);
            }
        });
    }

    // Amplitude modulation frequency parameter
    let freqAM = 2.0;
    const amFreqSlider = document.getElementById('am-freq');
    const amFreqText = document.getElementById('am-freq-text');
    function updateAMFreqText(val) {
        if (amFreqText) amFreqText.textContent = parseFloat(val).toFixed(2) + ' Hz';
    }
    if (amFreqSlider) {
        freqAM = parseFloat(amFreqSlider.value);
        updateAMFreqText(freqAM);
        amFreqSlider.addEventListener('input', e => {
            freqAM = parseFloat(e.target.value);
            updateAMFreqText(freqAM);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[3][0].frequency.setTargetAtTime(freqAM, audioCtx.currentTime, 0.01);
        });
    }

    // Modulation index parameter
    let modIndex = 0.0;
    const modIndexSlider = document.getElementById('mod-index');
    const modIndexText = document.getElementById('mod-index-text');
    function updateModIndexText(val) {
        if (modIndexText) modIndexText.textContent = parseFloat(val).toFixed(2);
    }
    if (modIndexSlider) {
        modIndex = parseFloat(modIndexSlider.value);
        updateModIndexText(modIndex);
        modIndexSlider.addEventListener('input', e => {
            modIndex = parseFloat(e.target.value);
            updateModIndexText(modIndex);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[4][1].gain.setTargetAtTime(modIndex, audioCtx.currentTime, 0.1);
        });
    }

    // FM frequency parameter
    let freqFM = 440.0;
    const fmFreqSlider = document.getElementById('fm-freq');
    const fmFreqText = document.getElementById('fm-freq-text');
    function updateFMFreqText(val) {
        if (fmFreqText) fmFreqText.textContent = parseFloat(val).toFixed(1) + ' Hz';
    }
    if (fmFreqSlider) {
        freqFM = parseFloat(fmFreqSlider.value);
        updateFMFreqText(freqFM);
        fmFreqSlider.addEventListener('input', e => {
            freqFM = parseFloat(e.target.value);
            updateFMFreqText(freqFM);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[4][0].frequency.setTargetAtTime(freqFM, audioCtx.currentTime, 0.01);
        });
    }

    // LFO parameters
    let freqLFO = 0.0;
    let depthLFO = 0.0;
    const lfoFreqSlider = document.getElementById('lfo-freq');
    const lfoDepthSlider = document.getElementById('lfo-depth');
    const lfoFreqText = document.getElementById('lfo-freq-text');
    const lfoDepthText = document.getElementById('lfo-depth-text');

    function updateLFOFreqText(val) {
        if (lfoFreqText) lfoFreqText.textContent = parseFloat(val).toFixed(2) + ' Hz';
    }
    function updateLFODepthText(val) {
        if (lfoDepthText) lfoDepthText.textContent = Math.round(val * 100) + '%';
    }

    if (lfoFreqSlider) {
        freqLFO = parseFloat(lfoFreqSlider.value);
        updateLFOFreqText(freqLFO);
        lfoFreqSlider.addEventListener('input', e => {
            freqLFO = parseFloat(e.target.value);
            updateLFOFreqText(freqLFO);

            //Update playing values
            oscLFO.frequency.setTargetAtTime(freqLFO, audioCtx.currentTime, 0.1);
        });
    }
    if (lfoDepthSlider) {
        depthLFO = parseFloat(lfoDepthSlider.value);
        updateLFODepthText(depthLFO);
        lfoDepthSlider.addEventListener('input', e => {
            depthLFO = parseFloat(e.target.value);
            updateLFODepthText(depthLFO);

            //Update playing values
            gainLFO.gain.value = depthLFO;
            globalGain.gain.value = 1.0 - gainLFO.gain.value;
        });
    }

    // Low pass filter parameter
    let freqLowPass = 20000;
    const lpCutoffSlider = document.getElementById('lp-cutoff');
    const lpCutoffText = document.getElementById('lp-cutoff-text');
    function updateLPCutoffText(val) {
        if (lpCutoffText) lpCutoffText.textContent = Math.round(val*100)+'%';
    }
    if (lpCutoffSlider) {
        freqLowPass = parseFloat(lpCutoffSlider.value);
        updateLPCutoffText(freqLowPass);
        lpCutoffSlider.addEventListener('input', e => {
            freqLowPass = parseFloat(e.target.value);
            updateLPCutoffText(freqLowPass);

            //Update playing values
            for (let [key, value] of activeVoices) activeVoices.get(key)[5].frequency.setTargetAtTime(keyboardFrequencyMap[key]*freqLowPass, audioCtx.currentTime, 0.1);
        });
    }

    // ^^^^^^^^^^^^^^^^^^^^^^^^ Update all parameters from UI elements ^^^^^^^^^^^^^^^^^^^^^^^^

    // ------------------ Main note playing functions ------------------


    function startNote(key) {
        //[[osc1, osc2, osc3, osc4, osc5, osc6], gain_keys, [gain1,gain2,gain3,gain4,gain5,gain6], [oscAM, gainAM, gainAM_and_keys], [oscFM, gainFM], lowPass]

        if (verbose) console.log("Note key played:", key);

        //Update relevant parameters for retriggering note if already active
        activeVoices.get(key)[0][0].stop(audioCtx.currentTime + 100);
        activeVoices.get(key)[0][1].stop(audioCtx.currentTime + 100);
        activeVoices.get(key)[0][2].stop(audioCtx.currentTime + 100);
        activeVoices.get(key)[0][3].stop(audioCtx.currentTime + 100);
        activeVoices.get(key)[0][4].stop(audioCtx.currentTime + 100);
        activeVoices.get(key)[0][5].stop(audioCtx.currentTime + 100);

        activeVoices.get(key)[0][0].type = selectedWaveform1;
        activeVoices.get(key)[0][1].type = selectedWaveform2;
        activeVoices.get(key)[0][2].type = selectedWaveform3;
        activeVoices.get(key)[0][3].type = selectedWaveform4;
        activeVoices.get(key)[0][4].type = selectedWaveform5;
        activeVoices.get(key)[0][5].type = selectedWaveform6;

        activeVoices.get(key)[0][0].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc1Offset, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[0][1].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc2Offset + Math.random() * 15, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[0][2].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc3Offset + Math.random() * 15, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[0][3].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc4Offset + Math.random() * 15, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[0][4].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc5Offset + Math.random() * 15, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[0][5].frequency.setTargetAtTime(keyboardFrequencyMap[key]*osc6Offset + Math.random() * 15, audioCtx.currentTime, 0.01);

        activeVoices.get(key)[2][0].gain.setTargetAtTime(osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
        activeVoices.get(key)[2][1].gain.setTargetAtTime(osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
        activeVoices.get(key)[2][2].gain.setTargetAtTime(osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
        activeVoices.get(key)[2][3].gain.setTargetAtTime(osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
        activeVoices.get(key)[2][4].gain.setTargetAtTime(osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);
        activeVoices.get(key)[2][5].gain.setTargetAtTime(osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain), audioCtx.currentTime, 0.1);

        activeVoices.get(key)[3][0].frequency.setTargetAtTime(freqAM, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[3][1].gain.setTargetAtTime(depthAM, audioCtx.currentTime, 0.1);
        activeVoices.get(key)[3][2].gain.setTargetAtTime(1.0 - activeVoices.get(key)[3][1].gain.value, audioCtx.currentTime, 0.1); //Could you get clipping when the last two lines happen at different speeds?

        activeVoices.get(key)[4][0].frequency.setTargetAtTime(freqFM, audioCtx.currentTime, 0.01);
        activeVoices.get(key)[4][1].gain.setTargetAtTime(modIndex, audioCtx.currentTime, 0.1);

        //ADSR  
        
        //activeVoices.get(key)[0].type = selectedWaveform; //change waveform on retrigger

        activeVoices.get(key)[1].gain.cancelScheduledValues(audioCtx.currentTime);
        let gain = activeVoices.get(key)[1].gain.value;
        if (verbose) console.log("Current gain before retrigger:", 1-gain/attackLevel, gain);

        //attack
        activeVoices.get(key)[1].gain.setTargetAtTime(attackLevel, audioCtx.currentTime, attackTime*Math.min(Math.max(1-gain/attackLevel, 0.01), 1)); 
        //decay
        activeVoices.get(key)[1].gain.setTargetAtTime(sustainLevel, audioCtx.currentTime + 3*attackTime, decayTime); 
    }
    
    function stopNote(key) {
        activeVoices.get(key)[1].gain.cancelScheduledValues(audioCtx.currentTime);
        activeVoices.get(key)[1].gain.setTargetAtTime(0, audioCtx.currentTime, releaseTime);

        activeVoices.get(key)[0][0].stop(audioCtx.currentTime + 5*releaseTime);
        activeVoices.get(key)[0][1].stop(audioCtx.currentTime + 5*releaseTime);
        activeVoices.get(key)[0][2].stop(audioCtx.currentTime + 5*releaseTime);
        activeVoices.get(key)[0][3].stop(audioCtx.currentTime + 5*releaseTime);
        activeVoices.get(key)[0][4].stop(audioCtx.currentTime + 5*releaseTime);
        activeVoices.get(key)[0][5].stop(audioCtx.currentTime + 5*releaseTime);
    }

    //Handle key events
    //------------------------------
    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    function keyDown(event) {
        const key = (event.detail || event.which).toString();

        if (keyboardFrequencyMap[key] && !keyPressed[key]) {
            keyPressed[key] = true;
            if(!activeVoices.has(key)) {

                // Six partials
                const osc1 = audioCtx.createOscillator();
                const osc2 = audioCtx.createOscillator();
                const osc3 = audioCtx.createOscillator();
                const osc4 = audioCtx.createOscillator();
                const osc5 = audioCtx.createOscillator();
                const osc6 = audioCtx.createOscillator();

                osc1.type = selectedWaveform1;
                osc2.type = selectedWaveform2;
                osc3.type = selectedWaveform3;
                osc4.type = selectedWaveform4;
                osc5.type = selectedWaveform5;
                osc6.type = selectedWaveform6;

                osc1.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc1Offset, audioCtx.currentTime);
                osc2.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc2Offset + Math.random() * 15, audioCtx.currentTime);
                osc3.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc3Offset + Math.random() * 15, audioCtx.currentTime);
                osc4.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc4Offset + Math.random() * 15, audioCtx.currentTime);
                osc5.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc5Offset + Math.random() * 15, audioCtx.currentTime);
                osc6.frequency.setValueAtTime(keyboardFrequencyMap[key]*osc6Offset + Math.random() * 15, audioCtx.currentTime);

                //Gain nodes for each partial
                const gain1 = audioCtx.createGain();
                const gain2 = audioCtx.createGain();
                const gain3 = audioCtx.createGain();
                const gain4 = audioCtx.createGain();
                const gain5 = audioCtx.createGain();
                const gain6 = audioCtx.createGain();

                gain1.gain.value = osc1Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);
                gain2.gain.value = osc2Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);
                gain3.gain.value = osc3Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);
                gain4.gain.value = osc4Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);
                gain5.gain.value = osc5Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);
                gain6.gain.value = osc6Gain / (osc1Gain+osc2Gain+osc3Gain+osc4Gain+osc5Gain+osc6Gain);

                osc1.connect(gain1);
                osc2.connect(gain2);
                osc3.connect(gain3);
                osc4.connect(gain4);
                osc5.connect(gain5);
                osc6.connect(gain6);

                //Creating amplitude modulation for each partial
                const oscAM = audioCtx.createOscillator();
                oscAM.type = 'sine'; // AM waveform type -----------------------
                oscAM.frequency.setValueAtTime(freqAM, audioCtx.currentTime);

                const gainAM = audioCtx.createGain();
                const gainAM_and_keys = audioCtx.createGain();

                gainAM.gain.value = depthAM;
                gainAM_and_keys.gain.value = 1.0 - gainAM.gain.value;

                oscAM.connect(gainAM)
                gainAM.connect(gainAM_and_keys.gain);

                gain1.connect(gainAM_and_keys);
                gain2.connect(gainAM_and_keys);
                gain3.connect(gainAM_and_keys);
                gain4.connect(gainAM_and_keys);
                gain5.connect(gainAM_and_keys);
                gain6.connect(gainAM_and_keys);

                //Creating Frequency Modulation for each partial
                const oscFM = audioCtx.createOscillator();
                oscFM.type = 'square';
                oscFM.frequency.setValueAtTime(freqFM, audioCtx.currentTime);

                const gainFM = audioCtx.createGain();
                gainFM.gain.value = modIndex;

                oscFM.connect(gainFM);
                gainFM.connect(osc1.frequency);
                gainFM.connect(osc2.frequency);
                gainFM.connect(osc3.frequency);
                gainFM.connect(osc4.frequency);
                gainFM.connect(osc5.frequency);
                gainFM.connect(osc6.frequency);

                //Creating low pass filter for the partials
                const lowPass = audioCtx.createBiquadFilter();
                lowPass.type = 'lowpass';
                lowPass.frequency.setValueAtTime(keyboardFrequencyMap[key]*freqLowPass, audioCtx.currentTime);
                

                //Connecting everything to key wide gain node and then to global gain
                const gain_keys = audioCtx.createGain();
                gain_keys.gain.value = 0.001;

                gainAM_and_keys.connect(lowPass);
                lowPass.connect(gain_keys);
                gain_keys.connect(globalGain);


                //Start all three oscillators
                oscAM.start();
                oscFM.start();
                osc1.start();
                osc2.start();
                osc3.start();
                osc4.start();
                osc5.start();
                osc6.start();

                if (verbose) console.log("Voices started", key, activeVoices.size);



                /*
                const gainNode = audioCtx.createGain();//
                const gainNodeComp = audioCtx.createGain();//
                osc.type = selectedWaveform;//
                osc.connect(gainNode).connect(gainNodeComp)//
                gainNodeComp.connect(globalGain);//
                osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);//
                osc.start();//
                gainNode.gain.value = 0.001;//
                gainNodeComp.gain.value = 1.0;//

                if (verbose) console.log("Voices started", key, activeVoices.size, gainNode.gain.value);//
                */

                osc1.onended = function() {
                    try { gain_keys.disconnect(); } catch (e) {}
                    if (activeVoices.has(key)) {
                        activeVoices.delete(key);
                    }
                    if (verbose) console.log("Voice ended for key:", key, activeVoices.size);
                };

                activeVoices.set(key, [[osc1, osc2, osc3, osc4, osc5, osc6], gain_keys, [gain1,gain2,gain3,gain4,gain5,gain6], [oscAM, gainAM, gainAM_and_keys], [oscFM, gainFM], lowPass]); 
            }

            startNote(key);

            /*
            if (frequencyMode) {
                Oscfreq.frequency.setTargetAtTime(keyboardFrequencyMap[key]*freqOffset+Math.random()+15, audioCtx.currentTime, freqTime);
                //Oscfreq.frequency.linearRampToValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime + freqTime);
            }*/

            // Show and update both dancing GIFs on key press
            const gifLeft = document.getElementById('dancing-gif-left');
            const gifRight = document.getElementById('dancing-gif-right');
            if (gifLeft && gifRight) {
                clearTimeout(gifTimeout);
                gifLeft.style.display = 'block';
                gifRight.style.display = 'block';
                gifLeft.src = preloadedImages[currentImageIndex].src;
                gifRight.src = preloadedImages[(currentImageIndex + 1) % preloadedImages.length].src;
                currentImageIndex = (currentImageIndex + 1) % preloadedImages.length;
                gifTimeout = setTimeout(() => {
                    gifLeft.src = '';
                    gifRight.src = '';
                    gifLeft.style.display = 'none';
                    gifRight.style.display = 'none';
                }, 5000);
            }
        }
    }

    function keyUp(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && keyPressed[key] && activeVoices.has(key)) {
            keyPressed[key] = false;
            stopNote(key);
            
            /*
            if (frequencyMode) {
                Oscfreq.frequency.setTargetAtTime(freqStart*freqOffset+Math.random()+15, audioCtx.currentTime+freqDelay, freqTime);
                //Oscfreq.frequency.linearRampToValueAtTime(freqStart, audioCtx.currentTime + freqTime);
            }*/
        }
    }
    // ^^^^^^^^^^^^^^^^^^^^^^^^ Main note playing functions ^^^^^^^^^^^^^^^^^^^^^^^^

    //---------------------------------------------------Extra features below------------------------------------------------

    // Dancing Bailar images
    const bailarImages = [
        'dancing-bailar/dancing-bailar-1 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-2 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-3 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-4 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-5 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-6 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-7 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-8 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-9 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-10 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-11 (dragged).jpeg',
        'dancing-bailar/dancing-bailar-12 (dragged).jpeg'
    ];

    // Preload images
    let gifTimeout; // To manage the GIF visibility timerx
    const preloadedImages = [];
    bailarImages.forEach(src => {
        const img = new Image();
        img.src = src;
        preloadedImages.push(img);
    });
    let currentImageIndex = 0;

    //Adding clipping visualization
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.fftSize;
    const floatData = new Float32Array(bufferLength);

    // Setup oscilloscope canvas
    const oscCanvas = document.getElementById('oscilloscope');
    let oscCtx = null;
    if (oscCanvas) {
        oscCtx = oscCanvas.getContext('2d');
        // ensure high-DPI looks ok
        const ratio = window.devicePixelRatio || 1;
        const w = oscCanvas.width;
        const h = oscCanvas.height;
        oscCanvas.width = Math.floor(w * ratio);
        oscCanvas.height = Math.floor(h * ratio);
        oscCanvas.style.width = w + 'px';
        oscCanvas.style.height = h + 'px';
        oscCtx.scale(ratio, ratio);
    }

    // Insert analyser into the output chain so it sees the summed output
    try { compressor.disconnect(); } catch (e) {}
    compressor.connect(analyser);
    analyser.connect(audioCtx.destination);

    const instMeter = document.getElementById('inst-level');
    const instText = document.getElementById('inst-level-text');
    const avgMeter = document.getElementById('avg-level');
    const avgText = document.getElementById('avg-level-text');

    // Set meters to amplitude mode (0 to 1)
    instMeter.min = 0;
    instMeter.max = 1;
    avgMeter.min = 0;
    avgMeter.max = 1;

    // Exponential smoothing state for short average (amplitude)
    let avgState = 0;

    function updateMeters() {

        analyser.getFloatTimeDomainData(floatData);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = floatData[i];
            sum += v * v;
        }
        const rms = Math.sqrt(sum / bufferLength); // amplitude, 0 to 1

        // Clamp to [0,1]
        const clampedInst = Math.max(0, Math.min(1, rms));
        instMeter.value = clampedInst;
        instText.textContent = clampedInst.toFixed(2);

        // Short exponential average (smooth the amplitude values)
        const smoothing = 0.08;
        avgState = avgState * (1 - smoothing) + clampedInst * smoothing;
        const clampedAvg = Math.max(0, Math.min(1, avgState));
        avgMeter.value = clampedAvg;
        avgText.textContent = clampedAvg.toFixed(2);

        // Draw oscilloscope waveform (centered)
        if (oscCtx) {
            const canvasW = parseInt(oscCanvas.style.width, 10) || oscCanvas.width;
            const canvasH = parseInt(oscCanvas.style.height, 10) || oscCanvas.height;
            oscCtx.clearRect(0, 0, canvasW, canvasH);
            // background
            oscCtx.fillStyle = '#111';
            oscCtx.fillRect(0, 0, canvasW, canvasH);
            // waveform
            oscCtx.lineWidth = 2;
            oscCtx.strokeStyle = '#0f0';
            oscCtx.beginPath();
            const sliceW = canvasW / bufferLength;
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const v = floatData[i];
                const y = (1 - (v + 1) / 2) * canvasH; // map -1..1 to 0..h
                if (i === 0) oscCtx.moveTo(x, y);
                else oscCtx.lineTo(x, y);
                x += sliceW;
            }
            oscCtx.stroke();
            // draw center line
            oscCtx.strokeStyle = 'rgba(255,255,255,0.08)';
            oscCtx.beginPath();
            oscCtx.moveTo(0, canvasH / 2);
            oscCtx.lineTo(canvasW, canvasH / 2);
            oscCtx.stroke();
        }

        requestAnimationFrame(updateMeters);
    }

    requestAnimationFrame(updateMeters);

});