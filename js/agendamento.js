// ============================================
// ZezoBarber — Lógica de agendamento
// Grade de horários de 20 em 20 minutos.
// Cada serviço ocupa 1 ou mais "vagas" seguidas,
// e ao confirmar, essas vagas ficam bloqueadas
// pros próximos clientes (simulado com localStorage,
// já que este é um projeto de estudo sem backend real).
// ============================================

const OPENING_MINUTES = 10 * 60; // 10:00
const CLOSING_MINUTES = 20 * 60; // 20:00
const SLOT_SIZE = 20; // minutos

const SERVICES = {
  corte: { label: "Corte tradicional", duration: 30, slots: 2, price: "R$ 45" },
  barba: { label: "Barba completa", duration: 20, slots: 1, price: "R$ 35" },
  combo: { label: "Corte + Barba", duration: 35, slots: 2, price: "R$ 70" },
};

const STORAGE_KEY = "zezobarber_agendamentos";

let state = {
  service: null,
  date: null,
  selectedSlotIndex: null,
};

function minutesToLabel(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function getAllSlots() {
  const slots = [];
  for (let t = OPENING_MINUTES; t < CLOSING_MINUTES; t += SLOT_SIZE) {
    slots.push(t);
  }
  return slots;
}

function getBookings() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveBookings(bookings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function getOccupiedSlotsForDate(date) {
  const bookings = getBookings();
  return bookings[date] || [];
}

// Verifica se, a partir do índice de slot escolhido, existem
// vagas seguidas suficientes livres (e dentro do horário de funcionamento)
function canFit(slots, occupied, startIndex, slotsNeeded) {
  if (startIndex + slotsNeeded > slots.length) return false;
  for (let i = startIndex; i < startIndex + slotsNeeded; i++) {
    if (occupied.includes(slots[i])) return false;
  }
  return true;
}

function renderServiceOptions() {
  const container = document.querySelector(".service-options");
  if (!container) return;

  container.innerHTML = Object.entries(SERVICES)
    .map(
      ([key, s]) => `
      <label class="service-option" data-service="${key}">
        <span class="service-option-name">
          <input type="radio" name="service" value="${key}" />
          ${s.label}
        </span>
        <span class="service-option-meta">${s.price} · ~${s.duration} min</span>
      </label>
    `
    )
    .join("");

  container.querySelectorAll(".service-option").forEach((el) => {
    el.addEventListener("click", () => {
      state.service = el.dataset.service;
      state.selectedSlotIndex = null;
      container
        .querySelectorAll(".service-option")
        .forEach((o) => o.classList.remove("selected"));
      el.classList.add("selected");
      el.querySelector("input").checked = true;
      renderSlots();
      renderSummary();
    });
  });
}

function renderSlots() {
  const grid = document.querySelector(".slots-grid");
  if (!grid) return;

  const slots = getAllSlots();
  const occupied = getOccupiedSlotsForDate(state.date).map((label) => {
    const [h, m] = label.split(":").map(Number);
    return h * 60 + m;
  });

  const serviceInfo = state.service ? SERVICES[state.service] : null;

  grid.innerHTML = slots
    .map((minutes, index) => {
      const label = minutesToLabel(minutes);
      const isOccupied = occupied.includes(minutes);

      let disabled = isOccupied;
      if (!isOccupied && serviceInfo) {
        disabled = !canFit(slots, occupied, index, serviceInfo.slots);
      } else if (!serviceInfo) {
        disabled = true; // precisa escolher o serviço primeiro
      }

      const isSelected = state.selectedSlotIndex === index;

      return `<button
        type="button"
        class="slot-btn ${isSelected ? "selected" : ""}"
        data-index="${index}"
        ${disabled ? "disabled" : ""}
      >${label}</button>`;
    })
    .join("");

  grid.querySelectorAll(".slot-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.selectedSlotIndex = Number(btn.dataset.index);
      renderSlots();
      renderSummary();
    });
  });
}

function renderSummary() {
  const summary = document.querySelector(".booking-summary");
  if (!summary) return;

  const serviceLine = summary.querySelector('[data-line="service"]');
  const timeLine = summary.querySelector('[data-line="time"]');
  const priceLine = summary.querySelector('[data-line="price"]');
  const confirmBtn = summary.querySelector(".btn-confirm");

  const serviceInfo = state.service ? SERVICES[state.service] : null;
  const slots = getAllSlots();

  serviceLine.textContent = serviceInfo ? serviceInfo.label : "—";
  priceLine.textContent = serviceInfo ? serviceInfo.price : "—";

  if (serviceInfo && state.selectedSlotIndex !== null) {
    const start = slots[state.selectedSlotIndex];
    const end = start + serviceInfo.slots * SLOT_SIZE;
    timeLine.textContent = `${minutesToLabel(start)} – ${minutesToLabel(end)}`;
  } else {
    timeLine.textContent = "—";
  }

  const ready =
    serviceInfo && state.selectedSlotIndex !== null && state.date;
  confirmBtn.disabled = !ready;
}

function handleBookingSubmit(event) {
  event.preventDefault();

  const feedback = document.querySelector(".booking-feedback");
  const nameInput = document.querySelector("#booking-name");
  const phoneInput = document.querySelector("#booking-phone");

  if (!state.service || state.selectedSlotIndex === null || !state.date) {
    feedback.textContent = "Escolha o serviço, a data e o horário antes de confirmar.";
    feedback.className = "booking-feedback error";
    return;
  }

  const slots = getAllSlots();
  const serviceInfo = SERVICES[state.service];
  const occupied = getOccupiedSlotsForDate(state.date).map((label) => {
    const [h, m] = label.split(":").map(Number);
    return h * 60 + m;
  });

  // Revalida antes de gravar, caso a vaga tenha sido tomada nesse meio tempo
  if (!canFit(slots, occupied, state.selectedSlotIndex, serviceInfo.slots)) {
    feedback.textContent = "Esse horário acabou de ficar indisponível. Escolha outro.";
    feedback.className = "booking-feedback error";
    state.selectedSlotIndex = null;
    renderSlots();
    renderSummary();
    return;
  }

  const bookings = getBookings();
  if (!bookings[state.date]) bookings[state.date] = [];

  const newSlots = [];
  for (let i = 0; i < serviceInfo.slots; i++) {
    newSlots.push(minutesToLabel(slots[state.selectedSlotIndex] + i * SLOT_SIZE));
  }
  bookings[state.date].push(...newSlots);
  saveBookings(bookings);

  const start = slots[state.selectedSlotIndex];
  const end = start + serviceInfo.slots * SLOT_SIZE;

  feedback.textContent = `Vaga confirmada! ${nameInput.value}, seu horário (${serviceInfo.label}) é às ${minutesToLabel(
    start
  )}, com término estimado às ${minutesToLabel(end)}.`;
  feedback.className = "booking-feedback success";

  nameInput.value = "";
  phoneInput.value = "";
  state.selectedSlotIndex = null;
  renderSlots();
  renderSummary();
}

function initBookingPage() {
  if (!document.querySelector(".booking")) return;

  const dateInput = document.querySelector("#booking-date");
  const today = new Date().toISOString().split("T")[0];
  dateInput.min = today;
  dateInput.value = today;
  state.date = today;

  dateInput.addEventListener("change", () => {
    state.date = dateInput.value;
    state.selectedSlotIndex = null;
    renderSlots();
    renderSummary();
  });

  renderServiceOptions();
  renderSlots();
  renderSummary();

  const form = document.querySelector(".booking-form");
  form.addEventListener("submit", handleBookingSubmit);
}

document.addEventListener("DOMContentLoaded", initBookingPage);