const form = document.getElementById("download-form");
const urlInput = document.getElementById("url-input");
const preview = document.getElementById("preview");
const previewThumb = document.getElementById("preview-thumb");
const previewTitle = document.getElementById("preview-title");
const previewMeta = document.getElementById("preview-meta");
const previewLoading = document.getElementById("preview-loading");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const statusText = document.getElementById("status-text");
const result = document.getElementById("result");
const downloadLink = document.getElementById("download-link");
const errorBox = document.getElementById("error");

const folderBtn = document.getElementById("folder-btn");
const folderLabel = document.getElementById("folder-label");
const folderMenu = document.getElementById("folder-menu");
const folderList = document.getElementById("folder-list");
const newFolderInput = document.getElementById("new-folder-input");
const newFolderBtn = document.getElementById("new-folder-btn");

let selectedFolder = "";
let pollTimer = null;

// ---------- Folder picker ----------

function renderFolderOption(folder) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "folder-option";
  btn.dataset.folder = folder;
  btn.textContent = `📁 ${folder}`;
  btn.addEventListener("click", () => selectFolder(folder));
  folderList.appendChild(btn);
}

function selectFolder(folder) {
  selectedFolder = folder;
  folderLabel.textContent = folder ? folder : "Default (downloads)";
  folderMenu.classList.add("hidden");
}

async function loadFolders() {
  try {
    const res = await fetch("/api/folders");
    const folders = await res.json();
    folderList.innerHTML = "";
    folders.forEach(renderFolderOption);
  } catch (err) {
    // Folder list is best-effort; ignore failures.
  }
}

folderBtn.addEventListener("click", () => {
  folderMenu.classList.toggle("hidden");
});

document.querySelector('.folder-option[data-folder=""]').addEventListener("click", () => {
  selectFolder("");
});

newFolderBtn.addEventListener("click", () => {
  const name = newFolderInput.value.trim();
  if (!name) return;
  renderFolderOption(name);
  selectFolder(name);
  newFolderInput.value = "";
});

newFolderInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    newFolderBtn.click();
  }
});

document.addEventListener("click", (e) => {
  if (!folderBtn.contains(e.target) && !folderMenu.contains(e.target)) {
    folderMenu.classList.add("hidden");
  }
});

loadFolders();

// ---------- Link preview ----------

const URL_RE = /^https?:\/\//i;
let previewTimer = null;
let previewRequestId = 0;

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function hidePreview() {
  preview.classList.add("hidden");
  previewLoading.classList.add("hidden");
}

async function fetchPreview(url) {
  const requestId = ++previewRequestId;
  previewLoading.classList.remove("hidden");
  preview.classList.add("hidden");

  try {
    const res = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();

    if (requestId !== previewRequestId) return; // stale response

    if (!res.ok) {
      hidePreview();
      return;
    }

    previewThumb.src = data.thumbnail || "";
    previewTitle.textContent = data.title || "";
    previewMeta.textContent = [data.uploader, formatDuration(data.duration)]
      .filter(Boolean)
      .join(" · ");

    previewLoading.classList.add("hidden");
    preview.classList.remove("hidden");
  } catch (err) {
    if (requestId === previewRequestId) hidePreview();
  }
}

urlInput.addEventListener("input", () => {
  clearTimeout(previewTimer);
  const url = urlInput.value.trim();

  if (!URL_RE.test(url)) {
    previewRequestId++;
    hidePreview();
    return;
  }

  previewTimer = setTimeout(() => fetchPreview(url), 600);
});

// ---------- Download flow ----------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  reset();

  const url = urlInput.value.trim();
  progressContainer.classList.remove("hidden");
  statusText.textContent = "Starting...";

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, folder: selectedFolder }),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || "Something went wrong");
      return;
    }

    pollTimer = setInterval(() => poll(data.job_id), 1000);
  } catch (err) {
    showError("Could not reach the server");
  }
});

async function poll(jobId) {
  const res = await fetch(`/api/status/${jobId}`);
  const job = await res.json();

  if (job.status === "downloading" || job.status === "processing") {
    progressFill.style.width = `${job.progress || 0}%`;
    statusText.textContent =
      job.status === "downloading"
        ? `Downloading... ${job.progress || 0}%`
        : "Processing...";
  } else if (job.status === "finished") {
    clearInterval(pollTimer);
    progressFill.style.width = "100%";
    statusText.textContent = "Done!";
    downloadLink.href = `/api/file/${jobId}`;
    result.classList.remove("hidden");
    loadFolders();
  } else if (job.status === "error") {
    clearInterval(pollTimer);
    showError(job.error || "Download failed");
  }
}

function reset() {
  clearInterval(pollTimer);
  progressContainer.classList.add("hidden");
  result.classList.add("hidden");
  errorBox.classList.add("hidden");
  progressFill.style.width = "0%";
}

function showError(msg) {
  progressContainer.classList.add("hidden");
  errorBox.textContent = msg;
  errorBox.classList.remove("hidden");
}
