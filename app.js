// Script.js – Vortragstimer Logik

const GREEN = "#2ECC71";
const ORANGE = "#F39C12";
const RED = "#E74C3C";

const timerDisplay = document.getElementById('timer-display');
const talkDisplay = document.getElementById('talk-display');
const qaDisplay = document.getElementById('qa-display');
const progress = document.getElementById('progress');

const timeInputs = document.getElementById('time-inputs');
const talkInput = document.getElementById('talk-time');
const qaInput = document.getElementById('qa-time');
const startBtn = document.getElementById('start-btn');
const autorunBtn = document.getElementById('autorun-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const pinBtn = document.getElementById('pin-btn');
const presetContainer = document.getElementById('presets');
const clock = document.getElementById('clock');
const colorInputs = document.getElementById('color-inputs');
const orangeInput = document.getElementById('orange-percent');
const redInput = document.getElementById('red-percent');
const shareBtn = document.getElementById('share-btn');
const muteBtn = document.getElementById('mute-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const progressBar = document.getElementById('progress-bar');

const clockFormatter = new Intl.DateTimeFormat(navigator.language, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

let timerRunning = false;
let talkRemaining = 0;
let qaRemaining = 0;

const url = new URL(location)
let talkDuration = Math.max(1, Number.parseFloat(url.searchParams.get("talk")) || 15) * 60; // minutes
talkInput.value = (talkDuration / 60).toString();
let qaDuration = Math.max(0, Number.parseFloat(url.searchParams.get("qa")) || 5) * 60; // minutes
qaInput.value = (qaDuration / 60).toString();
let orangeTime = Math.max(0, Math.min(100, Number.parseFloat(url.searchParams.get("orange")) || 85)) / 100;
orangeInput.value = (orangeTime * 100).toString();
let redTime = Math.max(0, Math.min(100, Number.parseFloat(url.searchParams.get("red")) || 95)) / 100;
if (redTime < orangeTime) redTime = orangeTime;
redInput.value = (redTime * 100).toString();
let autorunEnabled = url.searchParams.get("auto") === "1";
let beep = url.searchParams.get("beep") === "1";
let presetIndex = -1;
url.searchParams.get("presets")?.split("|")?.forEach((preset) => {
  const [talk, qa] = preset.split("+").slice(0, 2).map(v => Number.parseFloat(v));
  if (talk && talk > 1 && qa && qa > 0) addPreset(talk, qa);
})
const a = Number.parseInt(url.searchParams.get("preset"));
if (a >= 0) {
  presetIndex = Math.min(a, presetContainer.children.length - 1);
  updateDisplay();
}


shareBtn.onclick = () => {
  const url = new URL(location)
  url.searchParams.set("talk", talkInput.value.toString());
  url.searchParams.set("qa", qaInput.value.toString());
  url.searchParams.set("orange", (orangeTime * 100).toString());
  url.searchParams.set("red", (redTime * 100).toString());
  if (autorunEnabled) url.searchParams.set("auto", autorunEnabled ? "1" : "0");
  if (beep) url.searchParams.set("beep", beep ? "1" : "0");
  if (presetIndex >= 0) url.searchParams.set("preset", presetIndex.toString());
  const presets = [...presetContainer.children].map((div) => `${div.dataset.talk}+${div.dataset.qa}`).join("|");
  if (presets) url.searchParams.set("presets", presets);
  navigator.clipboard.writeText(url.toString()).then(() =>
    window.alert("Persistent link was copied to the clipboard")
  ).catch(() =>
    window.prompt("Persistent link:", url.toString())
  );
}
startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = () => {
  autorunEnabled = false;
  presetIndex = -1;
  resetTimer()
};
pinBtn.onclick = () => addPreset(talkInput.value, qaInput.value);
autorunBtn.onclick = () => {
  autorunEnabled = !autorunEnabled;
  if (autorunEnabled && !timerRunning) {
    if (presetIndex < 0) presetIndex = 0;
    presetContainer.children[presetIndex].click()
    resetTimer();
  }
  updateDisplay();
};
orangeInput.onchange = () => {
  orangeTime = Number.parseFloat(orangeInput.value) / 100 || 0;
  if (redTime < orangeTime) {
    orangeTime = redTime;
    redInput.value = 100 * orangeTime;
  }
  updateDisplay();
}
redInput.onchange = () => {
  redTime = Number.parseFloat(redInput.value) / 100 || 0;
  if (redTime < orangeTime) {
    orangeTime = redTime;
    orangeInput.value = 100 * redTime;
  }
  updateDisplay();
}
muteBtn.onclick = () => {
  beep = !beep;
  updateDisplay()
};
fullscreenBtn.onclick = async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
};

document.addEventListener('keyup', e => {
  if (e.key === 's') startBtn.click()
  if (e.key === 'r') resetBtn.click()
  for (let i = 0; i < presetContainer.children.length; i++) {
    if (e.target.tagName.toLowerCase() !== "input" && e.key === `${i + 1}`) presetContainer.children[i].click();
  }
}, false);

resetTimer();
updateDisplay();
setInterval(tick, 1000)

window.matchMedia('(display-mode: fullscreen)').addEventListener('change', () => updateDisplay());


function addPreset(talk, qa) {
  const index = presetContainer.children.length
  const div = document.createElement('button');
  div.classList.add('preset');
  div.dataset.talk = (talk || 1).toString();
  div.dataset.qa = (qa || 0).toString();
  div.dataset.index = `${index}`;
  div.innerHTML = `${div.dataset.talk} + ${div.dataset.qa}`;
  div.title = `Preset ${index + 1}` + (index < 9 ? ` (Hotkey: ${index + 1})` : "");
  div.onclick = ev => {
    talkInput.value = ev.target.dataset.talk;
    qaInput.value = ev.target.dataset.qa;
    presetIndex = Number.parseInt(ev.target.dataset.index);
    resetTimer();
  };
  presetContainer.appendChild(div);
  updateDisplay();
}

function colorAt(f) {
  return f >= redTime ? RED : f >= orangeTime ? ORANGE : GREEN;
}

function updateTime(display, remaining, duration) {
  display.querySelector('.minutes').textContent = Math.floor(remaining / 60).toString();
  display.querySelector('.seconds').textContent = Math.floor(remaining % 60).toString().padStart(2, '0');
  if (duration === 0) {
    display.style.display = "none";
  } else {
    display.style.display = "flex";
    display.style.color = colorAt((duration - remaining) / duration);
  }
}

function updateProgress(time, total) {
  progress.style.width = `${time / total * 100}%`;
  progress.style.backgroundColor = colorAt(time / total);
  let stops = [
    `color-mix(in srgb, ${GREEN} 40%, transparent) 0% ${orangeTime * 100}%`,
    `color-mix(in srgb, ${ORANGE} 40%, transparent) ${orangeTime * 100}% ${redTime * 100}%`,
    `color-mix(in srgb, ${RED} 40%, transparent) ${redTime * 100}% 100%`
  ];
  progressBar.style.background = `linear-gradient(to right, ${stops.join(",")})`

}

function updateDisplay() {
  updateTime(talkDisplay, talkRemaining, talkDuration);
  updateTime(qaDisplay, qaRemaining, qaDuration)
  talkDisplay.style.opacity = talkRemaining > 0 || qaRemaining === 0 ? "1" : "0.4";
  qaDisplay.style.opacity = talkRemaining > 0 ? "0.4" : "1";

  if (talkRemaining > 0 || qaDuration === 0) {
    updateProgress(talkDuration - talkRemaining, talkDuration);
  } else {
    updateProgress(qaDuration - qaRemaining, qaDuration);
  }

  if (talkRemaining === 0 && qaRemaining === 0) {
    timerDisplay.classList.add('blink');
  } else {
    timerDisplay.classList.remove('blink');
  }

  startBtn.style.display = timerRunning ? 'none' : "unset";
  pauseBtn.style.display = timerRunning ? "unset" : 'none';
  autorunBtn.style.display = presetContainer.children.length >= 2 ? 'block' : 'none';
  if (autorunEnabled) {
    autorunBtn.classList.add('autorun');
  } else {
    autorunBtn.classList.remove('autorun');
  }

  for (let i = 0; i < presetContainer.children.length; i++) {
    if (i === presetIndex) {
      presetContainer.children[i].classList.add("autorun");
    } else {
      presetContainer.children[i].classList.remove("autorun");
    }
  }


  clock.textContent = clockFormatter.format(new Date());
  muteBtn.textContent = beep ? "🔊" : "🔇";

  const fullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  for (const elem of [pinBtn, colorInputs, shareBtn]) {
    if (fullscreen) elem.classList.add("hidden")
    else elem.classList.remove("hidden")
  }
  for (const elem of [timeInputs, resetBtn]) {
    if (fullscreen && presetContainer.children.length > 1) elem.classList.add("hidden")
    else elem.classList.remove("hidden")
  }

}

function tick() {
  if (timerRunning) {
    if (talkRemaining > 0) {
      talkRemaining--;
      if (talkRemaining <= 0) {
        talkRemaining = 0;
        playBeep();
      }
    } else {
      qaRemaining--;
      if (qaRemaining <= 0) {
        qaRemaining = 0;
        playBeep();

        if (autorunEnabled) {
          startTimer((presetIndex + 1) % presetContainer.children.length)
        } else {
          pauseTimer()
        }
      }
    }
  }
  updateDisplay();
}

function startTimer(autorun = null) {
  if (autorun === false) {
    autorunEnabled = false;
  }
  if (Number.isInteger(autorun) && autorun !== presetIndex) {
    autorunEnabled = true;
    presetIndex = autorun
    presetContainer.children[presetIndex].click()
  } else if (talkRemaining === 0 && qaRemaining === 0) {
    resetTimer();
  }
  timerRunning = true;
}

function pauseTimer() {
  timerRunning = false;
}

function resetTimer() {
  timerRunning = false;
  talkDuration = (talkInput.value || 1) * 60;
  talkRemaining = talkDuration
  qaDuration = (qaInput.value || 0) * 60;
  qaRemaining = qaDuration;
  updateDisplay();
}

function playBeep(duration = 300) {
  if (!beep) return;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  // Configure oscillator for a low beep
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440 , audioCtx.currentTime);

  // Fade in and out softly
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + duration/8000);
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration/1000);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(audioCtx.currentTime);
  oscillator.stop(audioCtx.currentTime + duration/1000);


}
