/* ===========================================================
   SAFE HELPERS
=========================================================== */
const BACKEND_URL = "http://localhost:3000";

async function safeJson(response) {
    const text = await response.text();
    try {
        return text ? JSON.parse(text) : {};
    } catch {
        console.warn("Non-JSON response:", text);
        return {};
    }
}

const $ = (id) => document.getElementById(id);


/* ===========================================================
   STEP CONTROL
=========================================================== */

let currentStep = 1;
const totalSteps = 5;
let loanRequestId = null;

function showStep(n) {
    document.querySelectorAll(".form-step").forEach(step => step.classList.remove("active"));
    $(`step-${n}`).classList.add("active");

    $("prevBtn").style.display = n === 1 ? "none" : "inline-block";
    $("nextBtn").innerText = n === totalSteps ? "Submit" : "Next";

    updateProgressBar(n);
}

showStep(currentStep);


/* ===========================================================
   BUTTON HANDLING
=========================================================== */

async function nextPrev(direction) {

    if (direction === 1) {
        const ok = await runStepSave(currentStep);
        if (!ok) return;
    }

    if (currentStep === totalSteps && direction === 1) {
        await finalizeApplication();
        return;
    }

    currentStep += direction;
    currentStep = Math.max(1, Math.min(totalSteps, currentStep));

    showStep(currentStep);
}


/* ===========================================================
   RUN CORRECT SAVE PER STEP
=========================================================== */

async function runStepSave(step) {
    switch(step) {
        case 1: return await savePersonalDetails();
        case 2: return await saveGuarantorDetails();
        case 3: return await saveLoanDetails();
        case 4: return await uploadDocuments();
        default: return true;
    }
}


/* ===========================================================
   STEP 1 — PERSONAL DETAILS
=========================================================== */

async function savePersonalDetails() {

    const payload = {
        first_name: $("firstName").value,
        last_name: $("lastName").value,
        occupation: $("occupation").value,
        location: $("location").value,
        phone: $("phone").value
    };
   // const BACKEND_URL = "http://localhost:3000"; // or your backend host/port

const response = await fetch(`${BACKEND_URL}/api/v1/loan_requests/start`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
});

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.error || "Failed to save personal information");
        return false;
    }

    loanRequestId = data.id;
    return true;
}


/* ===========================================================
   STEP 2 — GUARANTOR DETAILS
=========================================================== */

async function saveGuarantorDetails() {

    // if (!loanRequestId) {
    //     alert("Loan ID missing");
    //     return false;
    // }

    const payload = {
        first_name: $("g_first").value,
        last_name: $("g_last").value,
        phone: $("g_phone").value,
        email: $("g_email").value,
        occupation: $("g_occupation").value,
        location: $("g_location").value
    };

    const response = await fetch(`${BACKEND_URL}/api/v1/loan_requests/${loanRequestId}/guarantor`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.error || "Failed to save guarantor details");
        return false;
    }

    return true;
}


/* ===========================================================
   STEP 3 — LOAN DETAILS
=========================================================== */

async function saveLoanDetails() {

    if (!loanRequestId) {
        alert("Loan ID missing");
        return false;
    }

    const payload = {
        loan_type: $("loanType").value,
        principal_amount: $("amount").value,
        term_months: $("tenure").value,
        purpose: $("purpose").value
    };

    const response = await fetch(`${BACKEND_URL}/api/v1/loan_requests/${loanRequestId}/loan_details`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.error || "Failed to save loan details");
        return false;
    }

    return true;
}


/* ===========================================================
   STEP 4 — DOCUMENT UPLOAD
=========================================================== */

async function uploadDocuments() {

    if (!loanRequestId) {
        alert("Loan ID missing");
        return false;
    }

    const formData = new FormData();

    if ($("payslip").files.length > 0) {
        formData.append("payslip", $("payslip").files[0]);
    }

    if ($("bankStatement").files.length > 0) {
        formData.append("bank_statement", $("bankStatement").files[0]);
    }

    if ([...formData].length === 0) return true;

    const response = await fetch(`${BACKEND_URL}/api/v1/loan_requests/${loanRequestId}/documents`, {
        method: "PUT",
        body: formData
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.error || "Failed to upload documents");
        return false;
    }

    return true;
}


/* ===========================================================
   STEP 5 — SUBMIT
=========================================================== */

async function finalizeApplication() {

    const response = await fetch(`${BACKEND_URL}/api/v1/loan_requests/${loanRequestId}/submit`, {
        method: "POST"
    });

    const data = await safeJson(response);

    if (!response.ok) {
        alert(data.error || "Failed to submit application");
        return;
    }

    window.location.href = "success.html";
}


/* ===========================================================
   PROGRESS BAR
=========================================================== */

function updateProgressBar(step) {
    $("progressFill").style.width = (step / totalSteps) * 100 + "%";
}
