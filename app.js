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
const voiceNote = document.querySelector("#voice-note");

let pages = [], pageIndex = 0, currentTitle = "", availableVoices = [];
let speechRun = 0, speechChunks = [], speechIndex = 0, speechState = "idle";

function paginate(text) {
  const paragraphs = text.replace(/\f/g, "\n").split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\n/g, " ").trim()).filter(Boolean);
  const output = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).length > 1400 && current) {
      output.push(current);
      current = paragraph;
    } else current += (current ? "\n\n" : "") + paragraph;
  }
  if (current) output.push(current);
  return output;
}

function chapterWord(number) {
  return ({ 1: "ONE", 2: "TWO", 3: "THREE", 4: "FOUR", 5: "FIVE", 6: "SIX", 7: "SEVEN", 8: "EIGHT", 9: "NINE", 10: "TEN" })[number] || number;
}

async function openChapter(id) {
  stopNarration();
  const chapter = chapters[id];
  currentTitle = chapter.title;
  chapterLabel.textContent = "CHAPTER " + chapterWord(Number(id));
  chapterTitle.textContent = currentTitle;
  reader.showModal();
  pageText.textContent = "Opening the manuscript…";
  try {
    const response = await fetch(chapter.file + "?v=" + Date.now(), { cache: "no-store" });
    if (!response.ok) throw new Error();
    pages = paginate(await response.text());
  } catch {
    pages = ["The chapter could not be loaded. Please check your connection and try again."];
  }
  pageIndex = 0;
  showPage();
}

function showPage() {
  stopNarration();
  pageText.textContent = pages[pageIndex];
  pageCount.textContent = "PART " + (pageIndex + 1) + " OF " + pages.length;
  previousButton.disabled = pageIndex === 0;
  nextButton.disabled = pageIndex === pages.length - 1;
  pageText.scrollTop = 0;
}

function bindChapterButtons(scope = document) {
  scope.querySelectorAll("[data-chapter]").forEach((button) => {
    button.onclick = () => openChapter(button.dataset.chapter);
  });
}

previousButton.addEventListener("click", () => { if (pageIndex > 0) { pageIndex -= 1; showPage(); } });
nextButton.addEventListener("click", () => { if (pageIndex < pages.length - 1) { pageIndex += 1; showPage(); } });
closeButton.addEventListener("click", () => { stopNarration(); reader.close(); });

function refreshVoices() {
  availableVoices = speechSynthesis.getVoices().filter((voice) => /^en/i.test(voice.lang));
  updateVoiceNote();
}
function isMaleVoice(voice) {
  return /\b(male|man)\b|david|mark|daniel|james|george|guy|ryan|aaron|arthur|fred|lee|oliver|reed|thomas/i.test(voice.name);
}
function isFemaleVoice(voice) {
  return /\b(female|woman)\b|zira|samantha|victoria|karen|moira|aria|jenny|susan|hazel|ava|serena/i.test(voice.name);
}
function selectedDeviceVoice(profile) {
  const wantsMale = profile.startsWith("male");
  return availableVoices.find(wantsMale ? isMaleVoice : isFemaleVoice)
    || availableVoices[0] || speechSynthesis.getVoices()[0] || null;
}
function updateVoiceNote() {
  if (!voiceNote) return;
  const profile = voiceSelect.value;
  const selected = selectedDeviceVoice(profile);
  if (!selected) voiceNote.textContent = "No English narration voice is available on this device.";
  else if (profile.startsWith("male") && !availableVoices.some(isMaleVoice))
    voiceNote.textContent = "No male device voice was found. A lower-pitched fallback will be used. Install an English male text-to-speech voice in your phone settings for a natural male narrator.";
  else voiceNote.textContent = "Device voice: " + selected.name;
}

function makeSpeechChunks(text) {
  const sentences = text.match(/[^.!?]+[.!?]+[”’\"']?|[^.!?]+$/g) || [text];
  const chunks = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    if ((current + " " + clean).length > 240 && current) { chunks.push(current); current = clean; }
    else current += (current ? " " : "") + clean;
  }
  if (current) chunks.push(current);
  return chunks;
}
function setAudioButtons() {
  pauseButton.textContent = speechState === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = speechState === "idle";
  stopButton.disabled = speechState === "idle";
  listenButton.textContent = speechState === "playing" ? "↻ Restart" : "▶ Listen";
}
function speakCurrentChunk(run) {
  if (run !== speechRun || speechState !== "playing") return;
  if (speechIndex >= speechChunks.length) { speechState = "idle"; speechIndex = 0; setAudioButtons(); return; }
  const profile = voiceSelect.value;
  const utterance = new SpeechSynthesisUtterance(speechChunks[speechIndex]);
  utterance.voice = selectedDeviceVoice(profile);
  utterance.rate = profile.includes("deep") ? .82 : profile.includes("clear") ? .96 : .89;
  utterance.pitch = profile.includes("deep") ? .55 : profile.startsWith("male") ? .72 : profile.includes("clear") ? 1.08 : 1;
  utterance.onend = () => { if (run === speechRun && speechState === "playing") { speechIndex += 1; speakCurrentChunk(run); } };
  utterance.onerror = (event) => { if (!["canceled", "interrupted"].includes(event.error)) { speechState = "idle"; setAudioButtons(); } };
  speechSynthesis.speak(utterance);
}
function startNarration() {
  speechRun += 1;
  speechSynthesis.cancel();
  speechChunks = makeSpeechChunks(currentTitle + ". " + pages[pageIndex]);
  speechIndex = 0;
  speechState = "playing";
  setAudioButtons();
  speakCurrentChunk(speechRun);
}
function pauseOrResumeNarration() {
  if (speechState === "playing") {
    speechState = "paused"; speechRun += 1; speechSynthesis.cancel(); setAudioButtons();
  } else if (speechState === "paused") {
    speechState = "playing"; speechRun += 1; setAudioButtons(); speakCurrentChunk(speechRun);
  }
}
function stopNarration() {
  speechRun += 1; speechState = "idle"; speechIndex = 0; speechSynthesis.cancel(); setAudioButtons();
}

listenButton.addEventListener("click", startNarration);
pauseButton.addEventListener("click", pauseOrResumeNarration);
stopButton.addEventListener("click", stopNarration);
voiceSelect.addEventListener("change", () => { updateVoiceNote(); if (speechState !== "idle") startNarration(); });

async function discoverUploadedChapters() {
  try {
    const response = await fetch("https://api.github.com/repos/jongpogi87/Legend-Of-Noera/contents", { cache: "no-store" });
    if (!response.ok) return;
    const files = await response.json();
    const chapterFiles = files.filter((file) => /^chapter-\d+\.txt$/i.test(file.name))
      .sort((a, b) => Number(a.name.match(/\d+/)[0]) - Number(b.name.match(/\d+/)[0]));
    for (const file of chapterFiles) {
      const id = Number(file.name.match(/\d+/)[0]);
      if (chapters[id]) continue;
      const text = await fetch(file.download_url, { cache: "no-store" }).then((result) => result.text());
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const heading = lines[0] || "Chapter " + id;
      const title = heading.includes(":") ? heading.split(":").slice(1).join(":").trim()
        : (lines[1] && lines[1].length < 100 ? lines[1] : "Chapter " + id);
      chapters[id] = { title, file: file.name };
      const card = document.createElement("article");
      const label = document.createElement("b");
      const headingElement = document.createElement("h3");
      const description = document.createElement("p");
      const button = document.createElement("button");
      label.textContent = "CHAPTER " + chapterWord(id);
      headingElement.textContent = title;
      description.textContent = "Continue the journey through Earth, Zionara, and the unfolding path of Noera.";
      button.textContent = "Read Chapter " + id;
      button.dataset.chapter = id;
      card.append(label, headingElement, description, button);
      document.querySelector(".books").append(card);
      bindChapterButtons(card);
    }
  } catch {}
}

bindChapterButtons();
refreshVoices();
speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
setAudioButtons();
discoverUploadedChapters();
