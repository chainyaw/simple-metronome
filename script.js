const bpmValueSpan = document.getElementById('bpm-value');
const bpmInputElement = document.getElementById('bpm-input');
const bpmSliderElement = document.getElementById('bpm-slider');
const playPauseBtn = document.getElementById('play-pause-btn');
const metronomeArm = document.querySelector('.metronome-arm');
const timeSignatureBtns = document.querySelectorAll('.ts-btn');

let bpm = 120;
let beatsPerMeasure = 4;
let isPlaying = false;
let timerId = null;
let audioContext = null;
let nextBeatTime = 0;
let currentBeatInMeasure = 0;

// --- Audio Context Setup ---
function initAudio() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            alert('Web Audio API is not supported in this browser.');
        }
    }
}

// --- Sound Generation ---
function scheduleTick(isStrongBeat) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    const frequency = isStrongBeat ? 880 : 440; // High pitch for strong beat, lower for weak
    osc.frequency.setValueAtTime(frequency, nextBeatTime);
    gain.gain.setValueAtTime(1, nextBeatTime);
    gain.gain.exponentialRampToValueAtTime(0.001, nextBeatTime + 0.05);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(nextBeatTime);
    osc.stop(nextBeatTime + 0.05);
}

// --- Metronome Core Logic (Scheduler) ---
function scheduler() {
    while (nextBeatTime < audioContext.currentTime + 0.1) {
        const isStrongBeat = currentBeatInMeasure === 0;
        scheduleTick(isStrongBeat);
        
        // Animate the arm
        const direction = currentBeatInMeasure % 2 === 0 ? 1 : -1;
        metronomeArm.style.transform = `rotate(${direction * 30}deg)`;

        // Advance beat time and count
        const secondsPerBeat = 60.0 / bpm;
        nextBeatTime += secondsPerBeat;
        currentBeatInMeasure = (currentBeatInMeasure + 1) % beatsPerMeasure;
    }
    timerId = window.setTimeout(scheduler, 25.0);
}

// --- UI Update Functions ---
function updateBpm(newValue) {
    bpm = Math.max(40, Math.min(240, newValue)); // Clamp value between 40 and 240
    bpmSliderElement.value = bpm;
    bpmInputElement.value = bpm;
}

// --- Event Listeners ---
bpmSliderElement.addEventListener('input', (e) => {
    updateBpm(parseInt(e.target.value, 10));
});

bpmInputElement.addEventListener('input', (e) => {
    updateBpm(parseInt(e.target.value, 10));
});

timeSignatureBtns.forEach(button => {
    button.addEventListener('click', () => {
        // Update active button
        timeSignatureBtns.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Update beats per measure
        beatsPerMeasure = parseInt(button.dataset.signature, 10);
        currentBeatInMeasure = 0; // Reset beat count on change
    });
});

playPauseBtn.addEventListener('click', () => {
    if (!audioContext) {
        initAudio();
    }

    isPlaying = !isPlaying;

    if (isPlaying) {
        // Function to start the scheduler
        const startScheduler = () => {
            playPauseBtn.textContent = 'Pause';
            playPauseBtn.classList.add('playing');
            currentBeatInMeasure = 0;
            nextBeatTime = audioContext.currentTime + 0.1; // Add a small lookahead buffer
            scheduler();
        };

        // Check if context is suspended and resume it if needed,
        // THEN start the scheduler.
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(startScheduler);
        } else {
            startScheduler();
        }
    } else {
        // Stop playing
        playPauseBtn.textContent = 'Play';
        playPauseBtn.classList.remove('playing');
        
        clearTimeout(timerId);
        timerId = null;
        metronomeArm.style.transform = 'rotate(0deg)';
    }
});
