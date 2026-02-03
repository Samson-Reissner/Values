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

    // Debug: Log the transactions to see what's coming from backend
    console.log("Transactions from API:", allTransactions);

    // Normalize backend values
    allTransactions = allTransactions.map(tx => {
      if (tx.transaction_type === "topup") tx.transaction_type = "deposit";
      
      // Ensure status is lowercase for consistency
      if (tx.status) {
        tx.status = tx.status.toLowerCase();
      }
      
      // Check if is_sender exists, default to false if not
      if (tx.is_sender === undefined || tx.is_sender === null) {
        // If we can't determine sender from API, try to infer from entry_type
        tx.is_sender = tx.entry_type === "debit";
      }
      
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
    .forEach(tx => {
      const card = createTransactionCard(tx);
      list.appendChild(card);
      
      // Debug: Log transaction details to console
      console.log(`Transaction ${tx.reference || tx.id}:`, {
        type: tx.transaction_type,
        status: tx.status,
        is_sender: tx.is_sender,
        entry_type: tx.entry_type,
        canRelease: canReleaseTransaction(tx)
      });
    });

  loadMoreBtn.style.display =
    visibleCount < filteredTransactions.length ? "inline-block" : "none";
}

function canReleaseTransaction(tx) {
  // Check if transaction can be released
  const isEscrow = tx.transaction_type === "escrow";
  const isHeld = tx.status === "held";
  const isSender = tx.is_sender === true;
  
  console.log(`canRelease check for ${tx.reference}:`, {
    isEscrow, isHeld, isSender,
    transaction_type: tx.transaction_type,
    status: tx.status,
    is_sender: tx.is_sender
  });
  
  return isEscrow && isHeld && isSender;
}

function createTransactionCard(tx) {
  const div = document.createElement("div");
  div.className = "transaction-card";

  const isCredit = tx.entry_type === "credit";
  const sign = isCredit ? "+" : "-";
  const amountClass = isCredit ? "positive" : "negative";

  const status = tx.status || "completed";
  
  // Determine if release button should be shown
  const canRelease = canReleaseTransaction(tx);
  
  console.log(`Creating card for ${tx.reference}: canRelease = ${canRelease}`);

  div.innerHTML = `
    <div class="transaction-left">
      <div class="transaction-icon ${isCredit ? "credit" : "debit"}">
        <i class="fas ${tx.transaction_type === 'escrow' ? 'fa-lock' : 'fa-exchange-alt'}"></i>
      </div>

      <div class="transaction-details">
        <h4>${formatTransactionTitle(tx.transaction_type)}</h4>
        <p class="reference">${tx.reference || tx.id || "N/A"}</p>
        <p class="date">
          <i class="far fa-clock"></i> ${formatDate(tx.created_at)}
        </p>
      </div>
    </div>

    <div class="transaction-right">
      <p class="transaction-amount ${amountClass}">
        ${sign} MWK ${Number(tx.amount).toLocaleString()}
      </p>

      <span class="transaction-status ${status}">
        ${formatStatusText(status)}
      </span>

      ${
        canRelease
          ? `<button class="release-btn" onclick="releaseEscrow(event, '${tx.reference || tx.id}')">
               <i class="fas fa-unlock"></i> Release
             </button>`
          : ""
      }
    </div>
  `;

  div.onclick = () => openDetailModal(tx);
  return div;
}

async function releaseEscrow(event, reference) {
  event.stopPropagation(); // prevent opening modal

  if (!confirm("Are you sure you want to release this escrow payment?")) return;

  const { token } = Auth.requireAuth();

  try {
    console.log(`Attempting to release escrow with reference: ${reference}`);
    
    const res = await fetch(
      `http://localhost:3000/api/v1/escrow_transactions/${reference}/release`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    if (!res.ok) {
      const err = await res.json();
      console.error("Release failed:", err);
      throw new Error(err.error || "Release failed");
    }

    const result = await res.json();
    console.log("Release successful:", result);
    
    alert("Payment released successfully");

    // 🔄 Reload transactions
    loadTransactions();

  } catch (err) {
    console.error("Release error:", err);
    alert(err.message || "Failed to release payment. Please try again.");
  }
}

/* =========================
   HELPER FUNCTIONS
========================= */
function formatTransactionTitle(transactionType) {
  const titles = {
    'deposit': 'Deposit',
    'send': 'Money Sent',
    'withdrawal': 'Withdrawal',
    'loan': 'Loan',
    'interest': 'Interest',
    'escrow': 'Escrow Payment',
    'payment': 'Payment',
    'transfer': 'Transfer'
  };
  
  return titles[transactionType] || 
         (transactionType ? transactionType.charAt(0).toUpperCase() + transactionType.slice(1) : 'Transaction');
}

function formatStatusText(status) {
  const statusMap = {
    'completed': 'Completed',
    'pending': 'Pending',
    'failed': 'Failed',
    'held': 'Held',
    'released': 'Released',
    'cancelled': 'Cancelled'
  };
  
  return statusMap[status] || 
         (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Completed');
}

/* =========================
   MODAL - Updated to show more details
========================= */
function openDetailModal(tx) {
  const status = tx.status || "completed";
  const isCredit = tx.entry_type === "credit";
  const sign = isCredit ? "+" : "-";
  const isSender = tx.is_sender === true;
  
  // Status color mapping
  const statusColors = {
    'completed': '#059669',
    'pending': '#d97706',
    'failed': '#dc2626',
    'held': '#3b82f6',
    'released': '#059669',
    'cancelled': '#6c757d'
  };
  
  const canRelease = canReleaseTransaction(tx);
  
  document.getElementById("transactionDetailContent").innerHTML = `
    <h3>
      <div class="transaction-icon ${isCredit ? "credit" : "debit"}" style="width: 40px; height: 40px;">
        <i class="fas ${tx.transaction_type === 'escrow' ? 'fa-lock' : 'fa-exchange-alt'}"></i>
      </div>
      ${formatTransactionTitle(tx.transaction_type)}
    </h3>
    
    <div class="detail-row">
      <span class="detail-label">Your Role</span>
      <span class="detail-value">${isSender ? 'Sender' : (isCredit ? 'Recipient' : 'Payer')}</span>
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value">
        <span style="color: ${statusColors[status] || '#6c757d'}; font-weight: 600;">
          ${formatStatusText(status)}
        </span>
      </span>
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Reference</span>
      <span class="detail-value">${tx.reference || tx.id || "N/A"}</span>
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Amount</span>
      <span class="detail-value" style="color: ${isCredit ? '#059669' : '#dc2626'};">
        ${sign} MWK ${Number(tx.amount).toLocaleString()}
      </span>
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Type</span>
      <span class="detail-value">${tx.transaction_type?.toUpperCase() || "TRANSACTION"}</span>
    </div>
    
    <div class="detail-row">
      <span class="detail-label">Date & Time</span>
      <span class="detail-value">${formatDate(tx.created_at)}</span>
    </div>
    
    ${tx.description ? `
      <div class="detail-row">
        <span class="detail-label">Description</span>
        <span class="detail-value">${tx.description}</span>
      </div>
    ` : ''}
    
    ${status === 'pending' ? `
      <div class="detail-row" style="background: rgba(245, 158, 11, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
        <span class="detail-label">
          <i class="fas fa-clock"></i> Note
        </span>
        <span class="detail-value" style="color: #d97706;">
          This transaction is pending confirmation
        </span>
      </div>
    ` : ''}
    
    ${canRelease ? `
      <div class="detail-row" style="background: rgba(59, 130, 246, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
        <span class="detail-label">
          <i class="fas fa-lock"></i> Escrow Action
        </span>
        <span class="detail-value">
          <button class="release-btn" onclick="releaseEscrow(event, '${tx.reference || tx.id}'); closeDetailModal();">
            <i class="fas fa-unlock"></i> Release Payment
          </button>
        </span>
      </div>
      <div class="detail-row" style="padding: 10px 0; font-size: 0.85rem; color: #6c757d;">
        <i class="fas fa-info-circle"></i>
        As the sender, you can release this escrow payment to the recipient
      </div>
    ` : ''}
    
    ${status === 'held' && !isSender && tx.transaction_type === 'escrow' ? `
      <div class="detail-row" style="background: rgba(59, 130, 246, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
        <span class="detail-label">
          <i class="fas fa-lock"></i> Escrow Status
        </span>
        <span class="detail-value" style="color: #3b82f6;">
          Waiting for sender to release payment
        </span>
      </div>
    ` : ''}
    
    ${status === 'failed' ? `
      <div class="detail-row" style="background: rgba(220, 38, 38, 0.05); padding: 15px; border-radius: 8px; margin-top: 15px;">
        <span class="detail-label">
          <i class="fas fa-exclamation-circle"></i> Status
        </span>
        <span class="detail-value" style="color: #dc2626;">
          This transaction failed to complete
        </span>
      </div>
    ` : ''}
    
    <div class="detail-row">
      <span class="detail-label">Transaction ID</span>
      <span class="detail-value" style="font-size: 0.85rem; color: #6c757d;">${tx.id || "N/A"}</span>
    </div>
  `;

  document.getElementById("transactionDetailModal").style.display = "flex";
}

function closeDetailModal() {
  document.getElementById("transactionDetailModal").style.display = "none";
}

// ... rest of your existing filter functions remain the same ...

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
    : allTransactions.filter(tx => (tx.status || "completed").toLowerCase() === status);

  visibleCount = 10;
  renderTransactions();
}

function filterTransactions() {
  const query = document.getElementById("searchTransactions").value.toLowerCase();

  filteredTransactions = allTransactions.filter(tx =>
    (tx.reference?.toLowerCase().includes(query) ||
    String(tx.amount).includes(query) ||
    tx.transaction_type?.toLowerCase().includes(query) ||
    (tx.status || "").toLowerCase().includes(query))
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
    return 0;
  });

  renderTransactions();
}

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