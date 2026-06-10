const form = document.getElementById("download-form");
const urlInput = document.getElementById("url-input");
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
  progressContainer.classList.remove("hidden");
  statusText.textContent = "Starting...";

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
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
