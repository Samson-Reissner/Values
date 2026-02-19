
import { API_BASE, authHeaders } from './config.js';

/* -------------------------
   Payment engine
--------------------------*/
async function initiatePayment({ category, provider_code, reference, amount }) {
  const wallet = window.valueWallet;

  if (!wallet) {
    throw new Error("Wallet not initialized");
  }

  if (wallet.balance < amount) {
    const shortfall = amount - wallet.balance;

    const proceed = confirm(
      `Insufficient funds.\n` +
      `You need MWK ${shortfall.toFixed(2)} more.\n\n` +
      `Would you like to proceed with a loan?`
    );

    if (!proceed) return null;

    return wallet.payBill({
      category,
      provider_code,
      reference,
      amount,
      allow_loan: true
    });
  }

  return wallet.payBill({
    category,
    provider_code,
    reference,
    amount,
    allow_loan: false
  });
}

/* -------------------------
   Modal initializer
   (CALL THIS AFTER PARTIAL LOAD)
--------------------------*/
export function initPayBillsModal() {
  console.log("✅ Initializing Pay Bills modal");

  const modal = document.getElementById("paymentModal");
  const payBtn = document.getElementById("payBillsBtn");
  const cancelBtn = document.getElementById("cancelPaymentBtn");
  const confirmBtn = document.getElementById("confirmPaymentBtn");

  const paymentType = document.getElementById("paymentType");
  const providerSelect = document.getElementById("serviceProvider");
  const paymentReference = document.getElementById("paymentReference");
  const paymentAmount = document.getElementById("paymentAmount");

  /* Guard clause (CRITICAL for partials) */
  if (
    !modal ||
    !payBtn ||
    !cancelBtn ||
    !confirmBtn ||
    !paymentType ||
    !providerSelect ||
    !paymentReference ||
    !paymentAmount
  ) {
    console.warn("⚠️ Pay Bills elements not found");
    return;
  }

  const providers = {
    utility: ["ESCOM", "Water Board", "Airtel Postpaid", "TNM Postpaid"],
    exam: ["MANEB", "UNIMA", "MUBAS"],
    school: ["Primary School", "Secondary School", "University"]
  };

  /* -------------------------
     Open / Close modal
  --------------------------*/
  payBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");
  });

  cancelBtn.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal();
  });

  function closeModal() {
    modal.classList.add("hidden");
    resetForm();
  }

  /* -------------------------
     Dynamic providers
  --------------------------*/
  paymentType.addEventListener("change", () => {
    providerSelect.innerHTML = "<option value=''>Select provider</option>";

    const list = providers[paymentType.value] || [];
    list.forEach(p => providerSelect.append(new Option(p, p)));
  });

  /* -------------------------
     Confirm payment
  --------------------------*/
  confirmBtn.addEventListener("click", async () => {
    const payload = {
      category: paymentType.value,
      provider_code: providerSelect.value,
      reference: paymentReference.value.trim(),
      amount: parseFloat(paymentAmount.value)
    };

    if (!isValid(payload)) {
      alert("Please fill in all payment details");
      return;
    }

    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    try {
      const tx = await initiatePayment(payload);
      if (!tx) return;

      alert(`Payment successful\nReference: ${tx.reference || "N/A"}`);
      closeModal();
    } catch (err) {
      alert(err.message || "Payment failed");
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "Pay";
    }
  });

  /* -------------------------
     Helpers
  --------------------------*/
  function isValid(p) {
    return (
      p.category &&
      p.provider_code &&
      p.reference &&
      !isNaN(p.amount) &&
      p.amount > 0
    );
  }

  function resetForm() {
    paymentType.value = "";
    providerSelect.innerHTML = "<option value=''>Select provider</option>";
    paymentReference.value = "";
    paymentAmount.value = "";
  }
}

/* -------------------------
   Auto-init if modal exists
   (for non-partial pages)
--------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("paymentModal")) {
    initPayBillsModal();
  }
});