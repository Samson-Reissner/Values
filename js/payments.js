/* payments.js
   Handles bill, exam, and school fee payments
*/
async function initiatePayment({ category, provider_code, reference, amount }) {
  const wallet = window.valueWallet;

  if (wallet.balance < amount) {
    const shortfall = amount - wallet.balance;

    const proceed = confirm(
      `Insufficient funds.\n` +
      `You need MWK ${shortfall} more.\n\n` +
      `Would you like to proceed with a loan?`
    );

    if (!proceed) {
      return; // user cancelled
    }

    // User accepted loan
    return wallet.payBill({
      category,
      provider_code,
      reference,
      amount,
      allow_loan: true
    });
  }

  // Sufficient funds → normal payment
  return wallet.payBill({
    category,
    provider_code,
    reference,
    amount,
    allow_loan: false
  });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ payments.js loaded");
    const modal = document.getElementById("paymentModal");
    const payBtn = document.getElementById("payBillsBtn");
    const cancelBtn = document.getElementById("cancelPaymentBtn");
    const confirmBtn = document.getElementById("confirmPaymentBtn");

    const paymentType = document.getElementById("paymentType");
    const providerSelect = document.getElementById("serviceProvider");

    //  GUARD CLAUSE (THIS IS THE FIX)
    if (!modal || !payBtn || !cancelBtn || !confirmBtn || !paymentType || !providerSelect) {
        console.warn("payments.js loaded but required elements not found");
        return;
    }

    const providers = {
        utility: ["ESCOM", "Water Board", "Airtel Postpaid", "TNM Postpaid"],
        exam: ["MANEB", "UNIMA", "MUBAS"],
        school: ["Primary School", "Secondary School", "University"]
    };

    /* -------------------------
       Modal controls
    --------------------------*/
    payBtn.addEventListener("click", () => {
        modal.classList.remove("hidden");
    });

    cancelBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        resetForm();
    });

    /* -------------------------
       Dynamic providers
    --------------------------*/
    paymentType.addEventListener("change", () => {
        providerSelect.innerHTML = "<option value=''>Select</option>";

        const list = providers[paymentType.value];
        if (!list) return;

        list.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p;
            opt.textContent = p;
            providerSelect.appendChild(opt);
        });
    });

    /* -------------------------
       Confirm payment
    --------------------------*/
   confirmBtn.addEventListener("click", async () => {
  const payload = {
    category: paymentType.value,
    provider_code: providerSelect.value,
    reference: document.getElementById("paymentReference").value,
    amount: parseFloat(document.getElementById("paymentAmount").value)
  };

  if (!isValid(payload)) {
    alert("Please fill all payment fields");
    return;
  }

  try {
    const tx = await initiatePayment(payload); // ✅ USE THIS
    if (!tx) return; // user cancelled loan prompt

    alert(`Payment successful\nRef: ${tx?.reference || "N/A"}`);
    modal.classList.add("hidden");
    resetForm();
  } catch (err) {
    alert(err.message);
  }
});

    /* -------------------------
       Helpers
    --------------------------*/
    function isValid(p) {
        return p.category && p.provider_code && p.reference && p.amount > 0;
    }

    function resetForm() {
        paymentType.value = "";
        providerSelect.innerHTML = "";
        document.getElementById("paymentReference").value = "";
        document.getElementById("paymentAmount").value = "";
    }
});
