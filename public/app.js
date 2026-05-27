const form = document.querySelector("#dateForm");
const status = document.querySelector("#formStatus");
const noButton = document.querySelector("#noButton");
const summary = document.querySelector("#summary");
const dots = [...document.querySelectorAll("[data-dot]")];
const screens = [...document.querySelectorAll("[data-screen]")];
const usedKey = "tiny-plan-submitted";

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
form.elements.date.min = tomorrow.toISOString().slice(0, 10);

if (localStorage.getItem(usedKey)) {
  showScreen("done");
  summary.innerHTML = "<strong>Already sent.</strong><span>Thank you for answering.</span>";
}

document.querySelectorAll("[data-next]").forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.next;
    if (target === "food" && !validateFields(["date", "time"])) return;
    if (target === "comment" && selectedFoods().length === 0) {
      showStatus("Pick at least one food first.", true);
      return;
    }
    showStatus("");
    showScreen(target);
  });
});

["pointerenter", "pointerdown", "focus"].forEach((eventName) => {
  noButton.addEventListener(eventName, moveNoButton);
});

noButton.addEventListener("click", () => {
  moveNoButton();
  noButton.textContent = "Still no?";
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (localStorage.getItem(usedKey)) {
    showScreen("done");
    return;
  }

  if (!validateFields(["date", "time", "name", "email", "comment"])) return;

  const payload = {
    date: form.elements.date.value,
    time: form.elements.time.value,
    food: selectedFoods(),
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    comment: form.elements.comment.value.trim(),
    page: location.href
  };

  showStatus("Sending...");

  try {
    const response = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json();

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Could not send right now.");
    }

    localStorage.setItem(usedKey, "yes");
    renderSummary(payload, result.emailed);
    showScreen("done");
  } catch (error) {
    showStatus(error.message, true);
  }
});

function showScreen(name) {
  screens.forEach((screen) => {
    screen.classList.toggle("active", screen.dataset.screen === name);
  });

  const index = { intro: 0, details: 1, food: 2, comment: 3, done: 3 }[name] || 0;
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("active", dotIndex <= index);
  });
}

function validateFields(names) {
  for (const name of names) {
    const field = form.elements[name];
    if (!field.checkValidity()) {
      field.reportValidity();
      return false;
    }
  }
  return true;
}

function selectedFoods() {
  return [...form.querySelectorAll('input[name="food"]:checked')].map((input) => input.value);
}

function moveNoButton() {
  const bounds = document.querySelector(".card").getBoundingClientRect();
  const button = noButton.getBoundingClientRect();
  const maxX = Math.max(8, bounds.width - button.width - 8);
  const maxY = Math.max(8, bounds.height - button.height - 8);

  noButton.classList.add("floating");
  noButton.style.left = `${Math.random() * maxX}px`;
  noButton.style.top = `${Math.random() * maxY}px`;
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function renderSummary(payload, emailed) {
  const date = new Date(`${payload.date}T12:00:00`);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  summary.innerHTML = `
    <strong>${formattedDate}</strong>
    <span>${escapeHtml(payload.time)}</span>
    <span>${escapeHtml(payload.food.join(", "))}</span>
    <small>${emailed ? "Email notification sent." : "Saved locally. Email needs SMTP setup."}</small>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
