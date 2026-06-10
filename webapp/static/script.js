const SVG_NS = "http://www.w3.org/2000/svg";

function buildPaths(svg, position) {
  for (let i = 0; i < 36; i++) {
    const d =
      `M-${380 - i * 5 * position} -${189 + i * 6}` +
      `C-${380 - i * 5 * position} -${189 + i * 6} ` +
      `-${312 - i * 5 * position} ${216 - i * 6} ` +
      `${152 - i * 5 * position} ${343 - i * 6}` +
      `C${616 - i * 5 * position} ${470 - i * 6} ` +
      `${684 - i * 5 * position} ${875 - i * 6} ` +
      `${684 - i * 5 * position} ${875 - i * 6}`;

    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("class", "flow-path");
    path.setAttribute("stroke-width", String(0.5 + i * 0.03));
    path.setAttribute("stroke-opacity", String(0.1 + i * 0.03));
    path.style.animationDuration = `${20 + Math.random() * 10}s`;
    path.style.animationDelay = `-${Math.random() * 30}s`;
    svg.appendChild(path);
  }
}

buildPaths(document.getElementById("paths-1"), 1);
buildPaths(document.getElementById("paths-2"), -1);

function buildTitle(text) {
  const titleEl = document.getElementById("title");
  let letterIndex = 0;

  text.split(" ").forEach((word) => {
    const wordEl = document.createElement("span");
    wordEl.className = "word";

    word.split("").forEach((char) => {
      const letterEl = document.createElement("span");
      letterEl.className = "letter";
      letterEl.textContent = char;
      letterEl.style.animationDelay = `${letterIndex * 0.03}s`;
      wordEl.appendChild(letterEl);
      letterIndex++;
    });

    titleEl.appendChild(wordEl);
  });
}

buildTitle("Video Downloader");

const form = document.getElementById("download-form");
const urlInput = document.getElementById("url-input");
const folderInput = document.getElementById("folder-input");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const statusText = document.getElementById("status-text");
const result = document.getElementById("result");
const downloadLink = document.getElementById("download-link");
const errorBox = document.getElementById("error");

let pollTimer = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  reset();

  const url = urlInput.value.trim();
  const folder = folderInput.value.trim();
  progressContainer.classList.remove("hidden");
  statusText.textContent = "Starting...";

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, folder }),
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
