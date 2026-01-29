// js/transaction-history.js

let allTransactions = [];
let filteredTransactions = [];
let visibleCount = 10;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  loadTransactions();
});

/* =========================
   API FETCH
========================= */
async function loadTransactions() {
  const { token, userId } = Auth.requireAuth();

  try {
    toggleLoading(true);

    const response = await fetch(
      `http://localhost:3000/api/v1/users/${userId}/transaction_logs`,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    allTransactions = await response.json();

    // Normalize backend values
    allTransactions = allTransactions.map(tx => {
      if (tx.transaction_type === "topup") tx.transaction_type = "deposit";
      return tx;
    });

    filteredTransactions = [...allTransactions];

    renderTransactions();

  } catch (error) {
    console.error(error);
    alert("Failed to load transaction history.");
  } finally {
    toggleLoading(false);
  }
}

/* =========================
   RENDERING
========================= */
function renderTransactions() {
  const list = document.getElementById("allTransactionsList");
  const noData = document.getElementById("noTransactions");
  const loadMoreBtn = document.getElementById("loadMoreBtn");

  list.innerHTML = "";
  toggleLoading(false);

  if (filteredTransactions.length === 0) {
    noData.style.display = "block";
    loadMoreBtn.style.display = "none";
    return;
  }

  noData.style.display = "none";

  filteredTransactions
    .slice(0, visibleCount)
    .forEach(tx => list.appendChild(createTransactionCard(tx)));

  loadMoreBtn.style.display =
    visibleCount < filteredTransactions.length ? "inline-block" : "none";
}

function createTransactionCard(tx) {
  const div = document.createElement("div");
  div.className = "transaction-item"; // Use original class name

  const isCredit = tx.entry_type === "credit";
  const sign = isCredit ? "+" : "-";
  const amountClass = isCredit ? "received" : "sent"; // Use original classes

  div.innerHTML = `
    <div class="transaction-icon">
      <i class="fas fa-exchange-alt"></i>
    </div>
    <div class="transaction-details">
      <div class="transaction-title">${tx.transaction_type?.toUpperCase() || "TRANSACTION"}</div>
      <div class="transaction-date">${formatDate(tx.created_at)}</div>
      <div>${tx.reference || "-"}</div>
    </div>
    <div class="transaction-amount ${amountClass}">
      ${sign} MWK ${Number(tx.amount).toLocaleString()}
    </div>
  `;

  div.onclick = () => openDetailModal(tx);

  return div;
}

/* =========================
   FILTERS
========================= */
function filterByType(type, el) {
  setActiveTab(el);

  filteredTransactions = type === "all"
    ? [...allTransactions]
    : allTransactions.filter(tx => tx.transaction_type === type);

  visibleCount = 10;
  renderTransactions();
}

function filterByStatus() {
  const status = document.getElementById("statusFilter").value;

  filteredTransactions = status === "all"
    ? [...allTransactions]
    : allTransactions.filter(tx => tx.status === status);

  visibleCount = 10;
  renderTransactions();
}

function filterTransactions() {
  const query = document.getElementById("searchTransactions").value.toLowerCase();

  filteredTransactions = allTransactions.filter(tx =>
    tx.reference?.toLowerCase().includes(query) ||
    String(tx.amount).includes(query)
  );

  visibleCount = 10;
  renderTransactions();
}

function filterByDate() {
  const value = document.getElementById("dateFilter").value;
  const now = new Date();

  if (value === "custom") {
    document.getElementById("customDateRange").style.display = "block";
    return;
  }

  document.getElementById("customDateRange").style.display = "none";

  filteredTransactions = allTransactions.filter(tx => {
    const date = new Date(tx.created_at);
    if (value === "today") return date.toDateString() === now.toDateString();
    if (value === "week") return date >= new Date(now - 7 * 86400000);
    if (value === "month") return date >= new Date(now.setMonth(now.getMonth() - 1));
    if (value === "year") return date >= new Date(now.setFullYear(now.getFullYear() - 1));
    return true;
  });

  visibleCount = 10;
  renderTransactions();
}

function sortTransactions() {
  const sort = document.getElementById("sortFilter").value;

  filteredTransactions.sort((a, b) => {
    if (sort === "newest") return new Date(b.created_at) - new Date(a.created_at);
    if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
    if (sort === "amount-high") return b.amount - a.amount;
    if (sort === "amount-low") return a.amount - b.amount;
  });

  renderTransactions();
}

/* =========================
   MODAL
========================= */
function openDetailModal(tx) {
  document.getElementById("transactionDetailContent").innerHTML = `
    <h3>${tx.transaction_type}</h3>
    <p><strong>Reference:</strong> ${tx.reference}</p>
    <p><strong>Amount:</strong> MWK ${tx.amount}</p>
    <p><strong>Status:</strong> ${tx.status}</p>
    <p><strong>Date:</strong> ${formatDate(tx.created_at)}</p>
  `;

  document.getElementById("transactionDetailModal").style.display = "flex";
}

function closeDetailModal() {
  document.getElementById("transactionDetailModal").style.display = "none";
}

/* =========================
   UTILITIES
========================= */
function loadMoreTransactions() {
  visibleCount += 10;
  renderTransactions();
}

function setActiveTab(el) {
  document.querySelectorAll(".filter-tab").forEach(tab =>
    tab.classList.remove("active")
  );
  if (el) el.classList.add("active");
}

function toggleLoading(show) {
  const loader = document.getElementById("loadingTransactions");
  if (loader) loader.style.display = show ? "block" : "none";
}

function formatDate(date) {
  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}