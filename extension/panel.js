const title = document.querySelector("#title");
const messages = document.querySelector("#messages");
const status = document.querySelector("#status");
const form = document.querySelector("form");
const question = document.querySelector("#question");
const thumbnail = document.querySelector("#thumbnail");
const starters = document.querySelector("#starters");
const send = form.querySelector(".send");
const conversations = new Map();
const expandedCitations = new WeakSet();
let activeVideo;
let refreshVersion = 0;

function videoIdFromUrl(value) {
  if (!value) return null;
  const url = new URL(value);
  if (url.origin !== "https://www.youtube.com") return null;
  const id = url.pathname === "/watch" ? url.searchParams.get("v") :
    url.pathname.match(/^\/(?:shorts|live)\/([\w-]+)\/?$/)?.[1];
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

function timestamp(seconds) {
  return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
}

async function seek(citation) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (videoIdFromUrl(tab?.url) !== citation.videoId) return;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [citation.videoId, citation.start],
      func: (expectedId, start) => {
        const url = new URL(location.href);
        const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.split("/")[2];
        const players = Array.from(document.querySelectorAll("video")).filter(video => {
          const rect = video.getBoundingClientRect();
          return rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight;
        });
        const player = players.find(video => !video.paused) ?? players[0];
        if (player?.closest(".ad-showing")) return false;
        if (id !== expectedId || !player || !player.readyState) return false;
        player.currentTime = start;
        return true;
      },
    });
    if (!result?.result) throw new Error();
  } catch {
    if (activeVideo === citation.videoId) status.textContent = "The video player isn’t ready. Try the timestamp again.";
  }
}

function appendCitedText(container, text, citations) {
  for (const part of text.split(/(\[\d+\])/)) {
    const citation = citations.find(item => part === `[${item.label}]`);
    if (!citation) {
      container.append(part);
      continue;
    }
    const reference = document.createElement("sup");
    reference.className = "reference";
    reference.textContent = part;
    container.append(reference);
  }
}

function appendInline(paragraph, text, citations) {
  let cursor = 0;
  for (const match of text.matchAll(/\*\*(\S[\s\S]*?)\*\*/g)) {
    appendCitedText(paragraph, text.slice(cursor, match.index), citations);
    const strong = document.createElement("strong");
    appendCitedText(strong, match[1], citations);
    paragraph.append(strong);
    cursor = match.index + match[0].length;
  }
  appendCitedText(paragraph, text.slice(cursor), citations);
}

function renderAnswer(text, citations) {
  const answer = document.createElement("div");
  answer.className = "answer";
  let block;
  for (const line of text.trim().split(/\r?\n/)) {
    const content = line.trim();
    if (!content) {
      block = null;
      continue;
    }
    const heading = content.match(/^#{1,6}\s+(.+)/);
    const item = content.match(/^(?:[-*+]|(\d+)[.)])\s+(.+)/);
    if (heading) {
      const title = document.createElement("h2");
      appendInline(title, heading[1], citations);
      answer.append(title);
      block = null;
    } else if (item) {
      const listType = item[1] ? "ol" : "ul";
      if (block?.localName !== listType) {
        block = document.createElement(listType);
        if (item[1]) block.start = Number(item[1]);
        answer.append(block);
      }
      const entry = document.createElement("li");
      appendInline(entry, item[2], citations);
      block.append(entry);
    } else {
      if (block?.localName !== "p") {
        block = document.createElement("p");
        answer.append(block);
      } else {
        block.append(" ");
      }
      appendInline(block, content, citations);
    }
  }
  if (citations.length) {
    const sources = document.createElement("div");
    sources.className = "sources";
    sources.setAttribute("role", "group");
    sources.setAttribute("aria-label", "Cited video passages");
    for (const citation of citations) {
      const row = document.createElement("button");
      row.className = "source-row";
      const label = document.createElement("span");
      label.textContent = `[${citation.label}]`;
      const start = timestamp(citation.start);
      const end = timestamp(citation.end);
      row.append(label, `${start} – ${end}`);
      row.setAttribute("aria-label", `Citation ${citation.label}, jump to ${start}, passage ends at ${end}`);
      row.onclick = () => seek(citation);
      const source = document.createElement("div");
      source.className = "source";
      source.append(row);
      {
        const hasExcerpt = typeof citation.excerpt === "string" && citation.excerpt.trim().length > 0;
        const excerpt = document.createElement(hasExcerpt ? "blockquote" : "p");
        excerpt.className = "source-excerpt";
        excerpt.id = "excerpt-" + crypto.randomUUID();
        excerpt.textContent = hasExcerpt ? citation.excerpt :
          "This answer arrived without transcript text. Restart the AskTube server and ask the question again.";
        excerpt.hidden = !expandedCitations.has(citation);

        const toggle = document.createElement("button");
        toggle.className = "excerpt-toggle";
        toggle.textContent = "Transcript";
        toggle.setAttribute("aria-label", `Transcript for citation ${citation.label}`);
        toggle.setAttribute("aria-controls", excerpt.id);
        toggle.setAttribute("aria-expanded", String(!excerpt.hidden));
        toggle.onclick = () => {
          excerpt.hidden = !excerpt.hidden;
          toggle.setAttribute("aria-expanded", String(!excerpt.hidden));
          if (excerpt.hidden) expandedCitations.delete(citation);
          else {
            expandedCitations.add(citation);
            excerpt.scrollIntoView({ block: "nearest" });
          }
        };
        source.append(toggle, excerpt);
      }
      sources.append(source);
    }
    answer.append(sources);
  }
  return answer;
}

function render() {
  const chat = conversations.get(activeVideo);
  messages.replaceChildren();
  for (const turn of chat?.turns ?? []) {
    const bubble = document.createElement("p");
    bubble.className = "question";
    bubble.textContent = turn.question;
    messages.append(bubble);
    if (turn.result) messages.append(renderAnswer(turn.result.answer, turn.result.citations));
  }
  question.disabled = !chat || chat.pending;
  send.disabled = question.disabled || !question.value.trim();
  starters.hidden = !chat || chat.turns.length > 0;
  status.classList.toggle("loading", Boolean(chat?.pending));
  status.textContent = chat?.status ?? "Choose a YouTube video or Short to ask a question.";
  messages.scrollTop = messages.scrollHeight;
}

async function refresh() {
  const version = ++refreshVersion;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (version !== refreshVersion) return;
  const id = videoIdFromUrl(tab?.url);
  title.textContent = id ? (tab.title?.replace(/\s*- YouTube$/, "") || "YouTube video") : "Open a YouTube video";
  if (id === activeVideo) return;
  activeVideo = id;
  thumbnail.hidden = !id;
  if (id) thumbnail.src = `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
  else thumbnail.removeAttribute("src");
  question.value = "";
  if (id && !conversations.has(id)) conversations.set(id, { turns: [], pending: false, status: "" });
  render();
}

thumbnail.addEventListener("error", () => { thumbnail.hidden = true; });
question.addEventListener("input", () => { send.disabled = !question.value.trim(); });
question.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!send.disabled) form.requestSubmit();
  }
});
starters.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || question.disabled) return;
  question.value = button.textContent;
  form.requestSubmit();
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const videoId = activeVideo;
  const chat = conversations.get(videoId);
  const text = question.value.trim();
  if (!chat || chat.pending || !text) return;
  const turn = { question: text };
  chat.turns.push(turn);
  chat.pending = true;
  chat.status = "Finding an answer in the transcript…";
  question.value = "";
  render();
  try {
    const response = await fetch("http://127.0.0.1:4317/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId, question: text }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    turn.result = result;
    chat.status = "";
  } catch (error) {
    chat.turns.pop();
    chat.status = error instanceof TypeError ? "Start the local AskTube server with npm run server, then try again." : error.message;
    if (activeVideo === videoId) question.value = text;
  } finally {
    chat.pending = false;
    if (activeVideo === videoId) {
      render();
      question.focus();
    }
  }
});

chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((_id, change) => {
  if (change.url || change.title || change.status === "complete") refresh();
});
await refresh();
