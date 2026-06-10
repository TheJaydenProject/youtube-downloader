const form = document.getElementById("download-form");
const urlInput = document.getElementById("url-input");
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
