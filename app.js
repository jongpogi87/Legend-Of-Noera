const chapters = {
  1: { title: "The Steward's Band", file: "chapter-1.txt" },
  2: { title: "A Different Path", file: "chapter-2.txt" }
};

const reader = document.querySelector("#reader");
const pageText = document.querySelector("#page-text");
const chapterLabel = document.querySelector("#chapter-label");
const chapterTitle = document.querySelector("#chapter-title");
const pageCount = document.querySelector("#page-count");
const previousButton = document.querySelector("#prev");
const nextButton = document.querySelector("#next");
const closeButton = document.querySelector("#close");
const listenButton = document.querySelector("#listen");
const pauseButton = document.querySelector("#pause");
const stopButton = document.querySelector("#stop");
const voiceSelect = document.querySelector("#voice");
const speedSelect = document.querySelector("#speed");
const autoNextCheckbox = document.querySelector("#auto-next");
const voiceNote = document.querySelector("#voice-note");
const discoveryStatus = document.querySelector("#chapter-discovery-status");

const canSpeak = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

let pages = [];
let pageIndex = 0;
let currentTitle = "";
let currentChapterId = "";
let availableVoices = [];
let speechRun = 0;
let speechChunks = [];
let speechIndex = 0;
let speechState = "idle";
let studioAudio = null;

function splitLongParagraph(paragraph, limit) {
  if (paragraph.length <= limit) return [paragraph];
  const sentences = paragraph.match(/[^.!?]+[.!?]+[”’\"']?|[^.!?]+$/g) || [paragraph];
  const parts = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    if ((current + " " + clean).length > limit && current) {
      parts.push(current);
      current = clean;
    } else {
      current += (current ? " " : "") + clean;
    }
  }
  if (current) parts.push(current);
  return parts;
}

function paginate(rawText) {
  const limit = window.matchMedia?.("(max-width: 600px)").matches ? 1250 : 1600;
  const normalized = rawText.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").replace(/\f/g, "\n\n");
  const paragraphs = normalized.split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean)
    .flatMap((paragraph) => splitLongParagraph(paragraph, limit));

  const output = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && (current + "\n\n" + paragraph).length > limit) {
      output.push(current);
      current = paragraph;
    } else {
      current += (current ? "\n\n" : "") + paragraph;
    }
  }
  if (current) output.push(current);
  return output;
}

function chapterWord(number) {
  return ({ 1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE", 6: "SIX", 7: "SEVEN", 8: "EIGHT", 9: "NINE", 10: "TEN" })[number] || String(number);
}

function roman(number) {
  const values = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let result = "";
  let remaining = number;
  for (const [value, glyph] of values) {
    while (remaining >= value) { result += glyph; remaining -= value; }
  }
  return result || String(number);
}

function saveSetting(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

function readSetting(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function saveReaderSettings() {
  if (voiceSelect) saveSetting("noeraVoice", voiceSelect.value);
  if (speedSelect) saveSetting("noeraSpeed", speedSelect.value);
  if (autoNextCheckbox) saveSetting("noeraAutoNext", autoNextCheckbox.checked ? "1" : "0");
}

function loadReaderSettings() {
  const savedVoice = readSetting("noeraVoice");
  const savedSpeed = readSetting("noeraSpeed");
  if (voiceSelect && savedVoice && [...voiceSelect.options].some((option) => option.value === savedVoice)) voiceSelect.value = savedVoice;
  if (speedSelect && savedSpeed && [...speedSelect.options].some((option) => option.value === savedSpeed)) speedSelect.value = savedSpeed;
  if (autoNextCheckbox) autoNextCheckbox.checked = readSetting("noeraAutoNext") === "1";
}

function openReaderWindow() {
  if (!reader) return;
  document.body.classList.add("reader-open");
  if (typeof reader.showModal === "function") {
    try { if (!reader.open) reader.showModal(); return; } catch {}
  }
  reader.setAttribute("open", "");
  reader.classList.add("is-open");
}

function closeReaderWindow() {
  stopNarration();
  document.body.classList.remove("reader-open");
  if (!reader) return;
  if (typeof reader.close === "function" && reader.open) {
    try { reader.close(); } catch { reader.removeAttribute("open"); }
  } else {
    reader.removeAttribute("open");
  }
  reader.classList.remove("is-open");
}

async function openChapter(id, autoStart = false) {
  stopNarration();
  const chapter = chapters[id];
  if (!chapter || !reader || !pageText) return;

  currentChapterId = String(id);
  currentTitle = chapter.title;
  chapterLabel.textContent = "CHAPTER " + chapterWord(Number(id));
  chapterTitle.textContent = currentTitle;
  openReaderWindow();
  pageText.setAttribute("aria-busy", "true");
  pageText.textContent = "Opening the manuscript…";
  pageCount.textContent = "LOADING";
  previousButton.disabled = true;
  nextButton.disabled = true;

  try {
    const response = await fetch(chapter.file + "?v=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error("The manuscript returned " + response.status + ".");
    const manuscript = await response.text();
    pages = paginate(manuscript);
    if (!pages.length) throw new Error("The manuscript file is empty.");
    pageIndex = 0;
    renderPage();
    pageText.focus({ preventScroll: true });
    if (autoStart) startNarration();
  } catch (error) {
    pages = [];
    pageIndex = 0;
    pageText.innerHTML = "<div class=\"reader-error\"><strong>This chapter could not be opened.</strong><br>Please make sure the file is named <code>" + chapter.file + "</code>, saved as UTF-8 text, and uploaded to the main folder. Then reload the website and try again.</div>";
    pageCount.textContent = "UNAVAILABLE";
    console.error("Legend of Noera reader:", error);
  } finally {
    pageText.removeAttribute("aria-busy");
  }
}

function renderPage() {
  if (!pageText || !pages.length) return;
  pageText.textContent = pages[pageIndex] || "";
  pageCount.textContent = "PART " + (pageIndex + 1) + " OF " + pages.length;
  previousButton.disabled = pageIndex === 0;
  nextButton.disabled = pageIndex === pages.length - 1;
  pageText.scrollTop = 0;
}

function showPage() {
  stopNarration();
  renderPage();
}

function bindChapterButtons(scope = document) {
  scope.querySelectorAll("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => openChapter(button.dataset.chapter));
  });
}

previousButton?.addEventListener("click", () => {
  if (pageIndex > 0) { pageIndex -= 1; showPage(); }
});
nextButton?.addEventListener("click", () => {
  if (pageIndex < pages.length - 1) { pageIndex += 1; showPage(); }
});
closeButton?.addEventListener("click", closeReaderWindow);
reader?.addEventListener("cancel", (event) => { event.preventDefault(); closeReaderWindow(); });
reader?.addEventListener("click", (event) => { if (event.target === reader) closeReaderWindow(); });

function refreshVoices() {
  if (!canSpeak) { availableVoices = []; updateVoiceNote(); return; }
  availableVoices = window.speechSynthesis.getVoices().filter((voice) => /^en/i.test(voice.lang));
  updateVoiceNote();
}

function isMaleVoice(voice) {
  return /\b(male|man)\b|david|mark|daniel|james|george|guy|ryan|aaron|arthur|fred|lee|oliver|reed|thomas|wavenet-[b-d-f-j]/i.test(voice.name);
}

function isFemaleVoice(voice) {
  return /\b(female|woman)\b|zira|samantha|victoria|karen|moira|aria|jenny|susan|hazel|ava|serena|wavenet-[a-c-e-g-h]/i.test(voice.name);
}

function selectedDeviceVoice(profile = "female-warm") {
  if (!canSpeak) return null;
  const wantsMale = profile.startsWith("male");
  return availableVoices.find(wantsMale ? isMaleVoice : isFemaleVoice)
    || availableVoices[0]
    || window.speechSynthesis.getVoices()[0]
    || null;
}

function updateVoiceNote(message = "") {
  if (!voiceNote) return;
  if (message) { voiceNote.textContent = message; return; }
  const profile = voiceSelect?.value || "female-warm";
  const selected = selectedDeviceVoice(profile);
  if (!canSpeak) {
    voiceNote.textContent = "Device narration is unavailable in this browser. Uploaded studio audio can still play.";
  } else if (!selected) {
    voiceNote.textContent = "No English narration voice is currently available on this device.";
  } else if (profile.startsWith("male") && !availableVoices.some(isMaleVoice)) {
    voiceNote.textContent = "No male device voice was found. A lower-pitched fallback will be used unless studio audio is uploaded.";
  } else {
    voiceNote.textContent = "Device voice: " + selected.name + " · Speed: " + (speedSelect?.value || "0.9") + "×";
  }
}

function makeSpeechChunks() {
  const chunks = [];
  for (let page = pageIndex; page < pages.length; page += 1) {
    const text = (page === pageIndex ? currentTitle + ". " : "") + pages[page];
    const sentences = text.match(/[^.!?]+[.!?]+[”’\"']?|[^.!?]+$/g) || [text];
    let current = "";
    for (const sentence of sentences) {
      const clean = sentence.trim();
      if (!clean) continue;
      if ((current + " " + clean).length > 230 && current) {
        chunks.push({ text: current, page });
        current = clean;
      } else {
        current += (current ? " " : "") + clean;
      }
    }
    if (current) chunks.push({ text: current, page });
  }
  return chunks;
}

function setAudioButtons() {
  if (!listenButton || !pauseButton || !stopButton) return;
  pauseButton.textContent = speechState === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = !["playing", "paused"].includes(speechState);
  stopButton.disabled = speechState === "idle";
  listenButton.textContent = ["playing", "paused"].includes(speechState) ? "↻ Restart" : "▶ Listen";
}

function finishNarration() {
  speechState = "idle";
  speechIndex = 0;
  studioAudio = null;
  setAudioButtons();
  const nextChapterId = String(Number(currentChapterId) + 1);
  if (autoNextCheckbox?.checked && chapters[nextChapterId]) {
    openChapter(nextChapterId, true);
  } else {
    updateVoiceNote("Narration finished.");
  }
}

function speakCurrentChunk(run) {
  if (!canSpeak || run !== speechRun || speechState !== "playing") return;
  if (speechIndex >= speechChunks.length) { finishNarration(); return; }
  const chunk = speechChunks[speechIndex];
  if (chunk.page !== pageIndex) { pageIndex = chunk.page; renderPage(); }

  const profile = voiceSelect?.value || "female-warm";
  const utterance = new SpeechSynthesisUtterance(chunk.text);
  utterance.voice = selectedDeviceVoice(profile);
  utterance.rate = Number(speedSelect?.value || .9);
  utterance.pitch = profile.includes("deep") ? .55 : profile.startsWith("male") ? .72 : profile.includes("clear") ? 1.08 : 1;
  utterance.onend = () => {
    if (run === speechRun && speechState === "playing") { speechIndex += 1; speakCurrentChunk(run); }
  };
  utterance.onerror = (event) => {
    if (!["canceled", "interrupted"].includes(event.error)) {
      speechState = "idle";
      setAudioButtons();
      updateVoiceNote("Narration stopped because the phone's speech engine reported an error.");
    }
  };
  window.speechSynthesis.speak(utterance);
}

function startDeviceNarration() {
  if (!canSpeak) {
    speechState = "idle";
    setAudioButtons();
    updateVoiceNote("No studio audio was found, and this browser does not provide device narration.");
    return;
  }
  speechRun += 1;
  window.speechSynthesis.cancel();
  speechChunks = makeSpeechChunks();
  speechIndex = 0;
  speechState = "playing";
  setAudioButtons();
  updateVoiceNote("Reading continuously at " + (speedSelect?.value || ".9") + "×. It will continue until paused or stopped.");
  speakCurrentChunk(speechRun);
}

async function startNarration() {
  if (!pages.length) return;
  stopNarration();
  const run = speechRun;
  const profile = voiceSelect?.value || "female-warm";
  const audioUrl = "audio/chapter-" + currentChapterId + "-" + profile + ".mp3?v=" + Date.now();
  const audio = new Audio(audioUrl);
  let fallbackStarted = false;

  const useDeviceFallback = () => {
    if (fallbackStarted || run !== speechRun) return;
    fallbackStarted = true;
    if (studioAudio === audio) studioAudio = null;
    updateVoiceNote("Studio narration has not been uploaded for this voice. Using the device voice instead.");
    startDeviceNarration();
  };

  studioAudio = audio;
  audio.preload = "auto";
  audio.playbackRate = Number(speedSelect?.value || .9);
  audio.onended = finishNarration;
  audio.onerror = useDeviceFallback;
  speechState = "loading";
  setAudioButtons();

  try {
    await audio.play();
    if (run !== speechRun) return;
    speechState = "playing";
    setAudioButtons();
    updateVoiceNote("Playing studio narration at " + audio.playbackRate + "×.");
  } catch {
    useDeviceFallback();
  }
}

function pauseOrResumeNarration() {
  if (studioAudio) {
    if (speechState === "playing") {
      studioAudio.pause();
      speechState = "paused";
    } else if (speechState === "paused") {
      studioAudio.play().then(() => { speechState = "playing"; setAudioButtons(); }).catch(() => {
        updateVoiceNote("The audio could not resume. Press Listen to restart it.");
      });
    }
    setAudioButtons();
    return;
  }

  if (speechState === "playing") {
    speechState = "paused";
    speechRun += 1;
    if (canSpeak) window.speechSynthesis.cancel();
    updateVoiceNote("Narration paused. Resume will repeat the current sentence.");
  } else if (speechState === "paused") {
    speechState = "playing";
    speechRun += 1;
    speakCurrentChunk(speechRun);
    updateVoiceNote("Narration resumed.");
  }
  setAudioButtons();
}

function stopNarration() {
  speechRun += 1;
  speechState = "idle";
  speechIndex = 0;
  if (canSpeak) window.speechSynthesis.cancel();
  if (studioAudio) {
    studioAudio.onerror = null;
    studioAudio.onended = null;
    studioAudio.pause();
    try { studioAudio.currentTime = 0; } catch {}
    studioAudio = null;
  }
  setAudioButtons();
}

listenButton?.addEventListener("click", startNarration);
pauseButton?.addEventListener("click", pauseOrResumeNarration);
stopButton?.addEventListener("click", stopNarration);
voiceSelect?.addEventListener("change", () => {
  saveReaderSettings();
  updateVoiceNote();
  if (speechState !== "idle") startNarration();
});
speedSelect?.addEventListener("change", () => {
  saveReaderSettings();
  if (studioAudio) studioAudio.playbackRate = Number(speedSelect.value);
  else if (["playing", "paused"].includes(speechState)) startDeviceNarration();
  updateVoiceNote();
});
autoNextCheckbox?.addEventListener("change", saveReaderSettings);

function createChapterCard(id, title) {
  const card = document.createElement("article");
  const number = document.createElement("div");
  const copy = document.createElement("div");
  const label = document.createElement("b");
  const heading = document.createElement("h3");
  const description = document.createElement("p");
  const button = document.createElement("button");
  const arrow = document.createElement("span");

  number.className = "book-number";
  number.textContent = roman(id);
  label.textContent = "CHAPTER " + chapterWord(id);
  heading.textContent = title;
  description.textContent = "Continue the journey through Earth, Zionara, and the unfolding path of Noera.";
  button.type = "button";
  button.dataset.chapter = id;
  button.append("Read Chapter " + id + " ", arrow);
  arrow.textContent = "→";
  copy.append(label, heading, description);
  card.append(number, copy, button);
  return card;
}

async function discoverUploadedChapters() {
  const bookShelf = document.querySelector(".books");
  if (!bookShelf) return;
  try {
    const response = await fetch("https://api.github.com/repos/jongpogi87/Legend-Of-Noera/contents", { cache: "no-store" });
    if (!response.ok) throw new Error("Chapter list unavailable");
    const files = await response.json();
    const chapterFiles = files.filter((file) => /^chapter-\d+\.txt$/i.test(file.name))
      .sort((a, b) => Number(a.name.match(/\d+/)[0]) - Number(b.name.match(/\d+/)[0]));

    let additions = 0;
    for (const file of chapterFiles) {
      const id = Number(file.name.match(/\d+/)[0]);
      if (chapters[id]) continue;
      let title = "Chapter " + id;
      try {
        const text = await fetch(file.download_url, { cache: "no-store" }).then((result) => result.text());
        const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        const heading = lines[0] || title;
        title = heading.includes(":") ? heading.split(":").slice(1).join(":").trim()
          : (lines[1] && lines[1].length < 100 ? lines[1] : title);
      } catch {}
      chapters[id] = { title, file: file.name };
      const card = createChapterCard(id, title);
      bookShelf.append(card);
      bindChapterButtons(card);
      additions += 1;
    }
    discoveryStatus.textContent = additions ? additions + " newly published chapter" + (additions === 1 ? " is" : "s are") + " available." : chapterFiles.length + " published chapters available.";
  } catch {
    discoveryStatus.textContent = "Published chapters are ready to read above.";
  }
}

// Bind the essential reader controls first. Optional settings can never block chapter opening.
bindChapterButtons();
loadReaderSettings();
refreshVoices();
if (canSpeak) {
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  window.setTimeout(refreshVoices, 300);
  window.setTimeout(refreshVoices, 1200);
}
setAudioButtons();
discoverUploadedChapters();
