/**
 * Send Money Modal Loader & Logic
 * Works with:
 *  - /partials/send-money-modal.html
 *  - wallet-dashboard.html
 */

document.addEventListener("DOMContentLoaded", function () {
  loadSendMoneyModal();
});

/**
 * Load modal HTML from external file
 */
function loadSendMoneyModal() {
  fetch("../partials/send-money-modal.html")
    .then(response => {
      if (!response.ok) throw new Error("HTTP error " + response.status);
      return response.text();
    })
    .then(html => {
      const container = document.getElementById("sendMoneyModalContainer");
      if (!container) {
        console.error("sendMoneyModalContainer not found");
        return;
      }
      container.innerHTML = html;
      initSendMoneyEvents();
    })
    .catch(error => console.error("Failed to load Send Money modal:", error));
}

/**
 * Fetch real balance from API
 */
async function fetchRealBalanceFromAPI() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.warn("No auth token found");
      return 0;
    }

    const API_BASE = "http://localhost:3000/api/v1";
    const response = await fetch(`${API_BASE}/wallet`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.balance || 0;
    
  } catch (error) {
    console.error("Failed to fetch balance from API:", error);
    return 0;
  }
}

/**
 * Format balance with commas and 2 decimal places
 */
function formatBalance(amount) {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Update modal balance with real balance from API
 */
async function updateModalBalance() {
  const modalBalanceElement = document.getElementById('modalWalletBalance');
  if (!modalBalanceElement) {
    console.warn("Modal balance element not found");
    return 0;
  }

  // Show loading state
  const originalText = modalBalanceElement.textContent;
  modalBalanceElement.textContent = "...";
  
  try {
    const realBalance = await fetchRealBalanceFromAPI();
    const formattedBalance = formatBalance(realBalance);
    modalBalanceElement.textContent = formattedBalance;
    return realBalance;
    
  } catch (error) {
    console.error("Failed to update modal balance:", error);
    modalBalanceElement.textContent = originalText;
    return 0;
  }
}

/**
 * Initialize modal events
 */
function initSendMoneyEvents() {
  const sendMoneyBtn = document.getElementById("sendMoneyBtn");
  const modal = document.getElementById("sendMoneyModal");
  const cancelBtn = document.getElementById("cancelSendBtn");
  const confirmBtn = document.getElementById("confirmSendBtn");

  const sendType = document.getElementById("sendType");
  const mobileFields = document.getElementById("mobileFields");
  const walletFields = document.getElementById("walletFields");

  const transferMode = document.getElementById("transferMode");
  const escrowFields = document.getElementById("escrowFields");
  const amountInput = document.getElementById("sendAmount");

  if (!sendMoneyBtn || !modal) {
    console.error("Send Money button or modal missing");
    return;
  }

  /* Open modal - Fetch fresh balance from API */
  sendMoneyBtn.addEventListener("click", async () => {
    // Fetch and update real balance before showing modal
    await updateModalBalance();
    
    // Show modal
    modal.classList.remove("hidden");
    
    // Focus on amount input
    setTimeout(() => {
      if (amountInput) {
        amountInput.focus();
      }
    }, 100);
  });

  /* Close modal */
  cancelBtn.addEventListener("click", () => {
    modal.classList.add("hidden");
    resetSendMoneyForm();
  });

  /* Toggle recipient type */
  sendType.addEventListener("change", () => {
    mobileFields.classList.add("hidden");
    walletFields.classList.add("hidden");

    if (sendType.value === "mobile") mobileFields.classList.remove("hidden");
    if (sendType.value === "wallet") walletFields.classList.remove("hidden");
  });

  /* Toggle transfer mode */
  if (transferMode) {
    transferMode.addEventListener("change", () => {
      if (transferMode.value === "escrow") {
        escrowFields.classList.remove("hidden");
        calculateEscrowAmounts();
        confirmBtn.innerText = "Send with Protection";
      } else {
        escrowFields.classList.add("hidden");
        confirmBtn.innerText = "Send Instantly";
      }
    });
  }

  /* Recalculate fee when amount changes */
  if (amountInput) {
    amountInput.addEventListener("input", calculateEscrowAmounts);
  }

  /* Submit - Validate against real balance */
  confirmBtn.addEventListener("click", async function() {
    await handleSendMoney();
  });
}

/**
 * Calculate escrow fee and net amount
 */
function calculateEscrowAmounts() {
  const amountField = document.getElementById("sendAmount");
  const feeEl = document.getElementById("feeAmount");
  const netEl = document.getElementById("netAmount");

  if (!amountField || !feeEl || !netEl) return;

  const amount = parseFloat(amountField.value || 0);
  if (amount <= 0) {
    feeEl.innerText = "0.00";
    netEl.innerText = "0.00";
    return;
  }

  const fee = amount * 0.01;
  const net = amount - fee;

  feeEl.innerText = fee.toFixed(2);
  netEl.innerText = net.toFixed(2);
}

/**
 * Handle send money submit with real balance validation
 */
async function handleSendMoney() {
  const sendType = document.getElementById("sendType").value;
  const amountInput = document.getElementById("sendAmount");
  const amount = parseFloat(amountInput.value);
  const recipientEmail = document.getElementById("recipientEmail").value;
  const transferMode = document.getElementById("transferMode").value;
  const purpose = document.getElementById("escrowPurpose")?.value;
  const agreeFee = document.getElementById("agreeFee")?.checked;

  // Validation
  if (sendType !== "wallet") {
    alert("Only wallet transfers supported");
    return;
  }

  if (!amount || amount < 100) {
    alert("Please enter a valid amount (minimum MWK 100)");
    return;
  }

  // Fetch FRESH balance from API for validation
  const currentBalance = await fetchRealBalanceFromAPI();
  
  // Check against real API balance
  if (amount > currentBalance) {
    alert(`Insufficient balance. You have MWK ${formatBalance(currentBalance)}. Please add money first.`);
    return;
  }

  if (!recipientEmail) {
    alert("Enter recipient email");
    return;
  }

  if (!transferMode) {
    alert("Select transfer type");
    return;
  }

  if (transferMode === "escrow") {
    if (!purpose) {
      alert("Enter payment purpose");
      return;
    }
    if (!agreeFee) {
      alert("You must agree to the escrow fee");
      return;
    }
  }

  const token = localStorage.getItem("authToken");
  const API_BASE = "http://localhost:3000/api/v1";

  // Show processing state
  const confirmBtn = document.getElementById("confirmSendBtn");
  const originalText = confirmBtn.innerHTML;
  confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
  confirmBtn.disabled = true;

  try {
    let response;
    let result;
    
    /* ============================
       DIRECT TRANSFER
       ============================ */
    if (transferMode === "direct") {
      response = await fetch(`${API_BASE}/wallet/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          recipient: recipientEmail,
          amount: amount
        })
      });
      
      result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Transfer failed");
      }
      
      // Success - update modal balance
      await updateModalBalance();
      
      alert(`Success! MWK ${formatBalance(amount)} sent to ${recipientEmail}`);
      document.getElementById("sendMoneyModal").classList.add("hidden");
      resetSendMoneyForm();
      
    } 
    /* ============================
       ESCROW TRANSFER
       ============================ */
    else {
      // First lookup recipient wallet
      const lookupResponse = await fetch(`${API_BASE}/wallets/lookup?email=${encodeURIComponent(recipientEmail)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const lookupData = await lookupResponse.json();
      if (lookupData.error) {
        throw new Error(lookupData.error);
      }

      // Create escrow transaction
      response = await fetch(`${API_BASE}/escrow_transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_wallet_id: lookupData.wallet_id,
          amount: amount,
          purpose: purpose
        })
      });
      
      result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Escrow transfer failed");
      }
      
      // Success - update modal balance
      await updateModalBalance();
      
      alert("Payment held in escrow successfully");
      document.getElementById("sendMoneyModal").classList.add("hidden");
      resetSendMoneyForm();
    }
    
  } catch (error) {
    console.error("Send money error:", error);
    alert(`Error: ${error.message}`);
  } finally {
    // Reset button state
    confirmBtn.innerHTML = originalText;
    confirmBtn.disabled = false;
  }
}

/**
 * Reset modal fields
 */
function resetSendMoneyForm() {
  document.getElementById("sendType").value = "";
  document.getElementById("sendAmount").value = "";
  document.getElementById("recipientEmail").value = "";
  document.getElementById("mobileNetwork").value = "";
  document.getElementById("mobileNumber").value = "";

  const transferMode = document.getElementById("transferMode");
  const escrowPurpose = document.getElementById("escrowPurpose");
  const agreeFee = document.getElementById("agreeFee");

  if (transferMode) transferMode.value = "";
  if (escrowPurpose) escrowPurpose.value = "";
  if (agreeFee) agreeFee.checked = false;

  document.getElementById("mobileFields").classList.add("hidden");
  document.getElementById("walletFields").classList.add("hidden");
  document.getElementById("escrowFields").classList.add("hidden");
  
  // Reset displayed amounts
  const feeEl = document.getElementById("feeAmount");
  const netEl = document.getElementById("netAmount");
  const displayAmount = document.getElementById("displayAmount");
  
  if (feeEl) feeEl.innerText = "0.00";
  if (netEl) netEl.innerText = "0.00";
  if (displayAmount) displayAmount.textContent = "MWK 0.00";
}