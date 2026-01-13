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
    .then(function (response) {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.text();
    })
    .then(function (html) {
      const container = document.getElementById("sendMoneyModalContainer");

      if (!container) {
        console.error("sendMoneyModalContainer not found in page");
        return;
      }

      container.innerHTML = html;
      initSendMoneyEvents();
    })
    .catch(function (error) {
      console.error("Failed to load Send Money modal:", error);
    });
}

/**
 * Initialize modal events
 */
function initSendMoneyEvents() {
  const sendMoneyBtn = document.getElementById("sendMoneyBtn");
  const modal = document.getElementById("sendMoneyModal");
  const cancelBtn = document.getElementById("cancelSendBtn");
  const sendType = document.getElementById("sendType");

  const mobileFields = document.getElementById("mobileFields");
  const walletFields = document.getElementById("walletFields");

  if (!sendMoneyBtn || !modal) {
    console.error("Send Money button or modal missing");
    return;
  }

  // Open modal
  sendMoneyBtn.addEventListener("click", function () {
    modal.classList.remove("hidden");
  });

  // Close modal
  cancelBtn.addEventListener("click", function () {
    modal.classList.add("hidden");
    resetSendMoneyForm();
  });

  // Toggle recipient fields
  sendType.addEventListener("change", function () {
    mobileFields.classList.add("hidden");
    walletFields.classList.add("hidden");

    if (sendType.value === "mobile") {
      mobileFields.classList.remove("hidden");
    }

    if (sendType.value === "wallet") {
      walletFields.classList.remove("hidden");
    }
  });

  // Confirm send (frontend only for now)
  document
    .getElementById("confirmSendBtn")
    .addEventListener("click", function () {
      handleSendMoney();
    });
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

  if (!recipientEmail) {
      alert("Please enter recipient email");
     return;
    }

  const payload = {
     recipient: recipientEmail,
     amount: amount
   };

  const token = localStorage.getItem("authToken"); // Assuming you store JWT

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
        // Optionally update balance on page
        document.getElementById("walletBalance").innerText = data.new_balance.toLocaleString();
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
  document.getElementById("mobileNetwork").value = "";
  document.getElementById("mobileNumber").value = "";
  document.getElementById("walletIdRecipient").value = "";

  document.getElementById("mobileFields").classList.add("hidden");
  document.getElementById("walletFields").classList.add("hidden");
}
