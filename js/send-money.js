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

  /* Open modal */
  sendMoneyBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
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

  /* Submit */
  confirmBtn.addEventListener("click", handleSendMoney);
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
 * Handle send money submit
 */
function handleSendMoney() {
  const sendType = document.getElementById("sendType").value;
  const amount = parseFloat(document.getElementById("sendAmount").value);
  const recipientEmail = document.getElementById("recipientEmail").value;
  const transferMode = document.getElementById("transferMode").value;
  const purpose = document.getElementById("escrowPurpose")?.value;
  const agreeFee = document.getElementById("agreeFee")?.checked;

  if (sendType !== "wallet") {
    alert("Only wallet transfers supported");
    return;
  }

  if (!amount || amount <= 0) {
    alert("Enter a valid amount");
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

  /* ============================
     DIRECT TRANSFER
     ============================ */
  if (transferMode === "direct") {
    fetch(`${API_BASE}/wallet/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        recipient: recipientEmail,
        amount: amount
      })
    })
      .then(res => res.json())
      .then(handleSuccess)
      .catch(console.error);

    return;
  }

  /* ============================
     ESCROW TRANSFER
     ============================ */
  fetch(`${API_BASE}/wallets/lookup?email=${encodeURIComponent(recipientEmail)}`, {
    headers: {
      "Authorization": `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);

      return fetch(`${API_BASE}/escrow_transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_wallet_id: data.wallet_id,
          amount: amount,
          purpose: purpose
        })
      });
    })
    .then(res => res.json())
    .then(data => {
      alert("Payment held in escrow successfully");
      document.getElementById("sendMoneyModal").classList.add("hidden");
      resetSendMoneyForm();
    })
    .catch(err => alert(err.message));
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
}
