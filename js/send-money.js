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

  if (!sendType || !amount || amount <= 0) {
    alert("Please select recipient and enter amount");
    return;
  }

  if (sendType !== "wallet") {
    alert("Mobile transfers are not yet implemented");
    return;
  }

  const recipientEmail = document.getElementById("recipientEmail").value;
  const transferMode = document.getElementById("transferMode").value;
  const purpose = document.getElementById("escrowPurpose")?.value;
  const agreeFee = document.getElementById("agreeFee")?.checked;

  if (!recipientEmail) {
    alert("Please enter recipient email");
    return;
  }

  if (!transferMode) {
    alert("Please select transfer type");
    return;
  }

  if (transferMode === "escrow") {
    if (!purpose) {
      alert("Please enter payment purpose");
      return;
    }

    if (!agreeFee) {
      alert("You must agree to the transfer fee");
      return;
    }
  }

  const payload = {
    recipient: recipientEmail,
    amount: amount,
    transfer_mode: transferMode,
    purpose: purpose || null
  };

  const token = localStorage.getItem("authToken");
  const API_BASE = "http://localhost:3000/api/v1";

  fetch(`${API_BASE}/wallet/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert("Error: " + data.error);
      } else {
        alert(`${data.message}\nNew Balance: MWK ${data.new_balance.toLocaleString()}`);
        document.getElementById("sendMoneyModal").classList.add("hidden");
        resetSendMoneyForm();
        document.getElementById("walletBalance").innerText =
          data.new_balance.toLocaleString();
      }
    })
    .catch(err => console.error(err));
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
