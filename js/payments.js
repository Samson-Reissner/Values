/* payments.js
   Handles bill, exam, and school fee payments
*/

document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ payments.js loaded");
    const modal = document.getElementById("paymentModal");
    const payBtn = document.getElementById("payBillsBtn");
    const cancelBtn = document.getElementById("cancelPaymentBtn");
    const confirmBtn = document.getElementById("confirmPaymentBtn");

    const paymentType = document.getElementById("paymentType");
    const providerSelect = document.getElementById("serviceProvider");

    // ✅ GUARD CLAUSE (THIS IS THE FIX)
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
    confirmBtn.addEventListener("click", () => {
        const payload = {
            category: paymentType.value,
            provider: providerSelect.value,
            reference: document.getElementById("paymentReference").value,
            amount: parseFloat(document.getElementById("paymentAmount").value)
        };

        if (!isValid(payload)) {
            alert("Please fill all payment fields");
            return;
        }

        try {
            const tx = window.valueWallet?.payBill(payload);
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
        return p.category && p.provider && p.reference && p.amount > 0;
    }

    function resetForm() {
        paymentType.value = "";
        providerSelect.innerHTML = "";
        document.getElementById("paymentReference").value = "";
        document.getElementById("paymentAmount").value = "";
    }
});
