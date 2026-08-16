const form = document.getElementById("download-form");
const urlRows = document.getElementById("url-rows");
const addRowBtn = document.getElementById("add-row-btn");
const rowTemplate = document.getElementById("url-row-template");
const queueItemTemplate = document.getElementById("queue-item-template");
const progressContainer = document.getElementById("progress-container");
const queuePosition = document.getElementById("queue-position");
const currentTitle = document.getElementById("current-title");
const progressBar = document.querySelector(".progress-bar");
const progressFill = document.getElementById("progress-fill");
const statusText = document.getElementById("status-text");
const completedList = document.getElementById("completed-list");
const result = document.getElementById("result");
const anotherBtn = document.getElementById("another-btn");
const errorBox = document.getElementById("error");
const errorText = document.getElementById("error-text");
const formatSelect = document.getElementById("format-select");

const URL_RE = /^https?:\/\//i;
const CHECK_ICON = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>';
const ERROR_ICON = '<path d="M12 9v4m0 4h.01M10.3 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.7 3.86a1 1 0 0 0-1.72 0Z"/>';

let pollTimer = null;

// ---------- URL rows ----------

function addRow() {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  urlRows.appendChild(row);
  attachRow(row);
  updateRemoveButtons();
  return row;
}

function attachRow(row) {
  const input = row.querySelector(".url-input");
  const removeBtn = row.querySelector(".remove-row-btn");
  const preview = row.querySelector(".preview");
  const previewThumb = row.querySelector(".preview-thumb");
  const previewTitle = row.querySelector(".preview-title");
  const previewMeta = row.querySelector(".preview-meta");
  const previewLoading = row.querySelector(".preview-loading");

  let previewTimer = null;
  let previewRequestId = 0;

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

  input.addEventListener("input", () => {
    clearTimeout(previewTimer);
    const url = input.value.trim();

    if (!URL_RE.test(url)) {
      previewRequestId++;
      hidePreview();
      return;
    }

    previewTimer = setTimeout(() => fetchPreview(url), 600);
  });

  removeBtn.addEventListener("click", () => {
    row.remove();
    updateRemoveButtons();
  });
}

function updateRemoveButtons() {
  const rows = urlRows.querySelectorAll(".url-row");
  rows.forEach((row) => {
    const removeBtn = row.querySelector(".remove-row-btn");
    removeBtn.classList.toggle("hidden", rows.length <= 1);
  });
}

function resetRows() {
  urlRows.innerHTML = "";
  addRow();
}

addRowBtn.addEventListener("click", () => {
  const row = addRow();
  row.querySelector(".url-input").focus();
});

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "";
  seconds = Math.round(seconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// ---------- Download flow ----------

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  reset();

  const rows = [...urlRows.querySelectorAll(".url-row")];
  const entries = rows
    .map((row) => ({
      url: row.querySelector(".url-input").value.trim(),
      title: row.querySelector(".preview-title").textContent.trim(),
    }))
    .filter((entry) => entry.url);

  if (entries.length === 0) {
    showError("Please enter at least one link");
    return;
  }

  if (entries.some((entry) => !URL_RE.test(entry.url))) {
    showError("Please enter valid http(s) URLs");
    return;
  }

  form.classList.add("hidden");
  progressContainer.classList.remove("hidden");
  progressBar.classList.add("skeleton");
  statusText.textContent = "Fetching video info — this can take a moment";

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: entries.map((entry) => entry.url),
        format: formatSelect.value,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      form.classList.remove("hidden");
      showError(data.error || "Something went wrong");
      return;
    }

    runQueue(data.job_ids, entries);
  } catch (err) {
    form.classList.remove("hidden");
    showError("Could not reach the server");
  }
});

async function runQueue(jobIds, entries) {
  for (let i = 0; i < jobIds.length; i++) {
    queuePosition.textContent =
      jobIds.length > 1 ? `Item ${i + 1} of ${jobIds.length}` : "";
    currentTitle.textContent = entries[i].title || entries[i].url;
    progressFill.style.width = "0%";
    progressBar.classList.add("skeleton");
    statusText.textContent = "Fetching video info — this can take a moment";

    await new Promise((resolve) => {
      pollTimer = setInterval(() => poll(jobIds[i], resolve), 1000);
    });
  }

  progressContainer.classList.add("hidden");
  result.classList.remove("hidden");
}

function poll(jobId, done) {
  fetch(`/api/status/${jobId}`)
    .then((res) => res.json())
    .then((job) => {
      if (job.status === "downloading" || job.status === "processing") {
        progressBar.classList.remove("skeleton");
        progressFill.style.width = `${job.progress || 0}%`;
        statusText.textContent =
          job.status === "downloading"
            ? `Capturing — ${job.progress || 0}%`
            : "Processing";
      } else if (job.status === "finished") {
        clearInterval(pollTimer);
        progressBar.classList.remove("skeleton");
        progressFill.style.width = "100%";
        statusText.textContent = "Transfer complete";
        addCompletedItem(job.title || job.filename, "Saved", false);

        // Trigger the browser download automatically — no extra click needed.
        const autoLink = document.createElement("a");
        autoLink.href = `/api/file/${jobId}`;
        autoLink.download = "";
        document.body.appendChild(autoLink);
        autoLink.click();
        autoLink.remove();

        done();
      } else if (job.status === "error") {
        clearInterval(pollTimer);
        progressBar.classList.remove("skeleton");
        addCompletedItem(job.error || "Download failed", "Failed", true);
        done();
      }
    });
}

function addCompletedItem(title, status, isError) {
  const item = queueItemTemplate.content.firstElementChild.cloneNode(true);
  const icon = item.querySelector(".queue-item-icon");
  const titleEl = item.querySelector(".queue-item-title");
  const statusEl = item.querySelector(".queue-item-status");

  icon.innerHTML = isError ? ERROR_ICON : CHECK_ICON;
  icon.classList.add(isError ? "fault" : "ready");
  titleEl.textContent = title;
  statusEl.textContent = status;

  completedList.appendChild(item);
  completedList.classList.remove("hidden");
}

anotherBtn.addEventListener("click", () => {
  reset();
  resetRows();
  form.classList.remove("hidden");
  urlRows.querySelector(".url-input").focus();
});

function reset() {
  clearInterval(pollTimer);
  progressContainer.classList.add("hidden");
  completedList.classList.add("hidden");
  completedList.innerHTML = "";
  result.classList.add("hidden");
  errorBox.classList.add("hidden");
  progressBar.classList.remove("skeleton");
  progressFill.style.width = "0%";
  queuePosition.textContent = "";
  currentTitle.textContent = "";
}

function showError(msg) {
  progressContainer.classList.add("hidden");
  errorText.textContent = msg;
  errorBox.classList.remove("hidden");
}

// Start with a single empty link row.
addRow();
