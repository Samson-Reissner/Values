// js/kyc.js

let currentStep = 1;
const totalSteps = 3;

// ==========================
// AUTH
// ==========================
const token = localStorage.getItem("authToken");
if (!token) {
  window.location.href = "login.html";
}

// ==========================
// DOM ELEMENTS
// ==========================
const stepIndicators = document.querySelectorAll(".step");
const stepContents = document.querySelectorAll(".step-content");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

// Step 1 (prefilled + editable)
const firstNameField = () => document.getElementById("firstName");
const lastNameField = () => document.getElementById("lastName");
const emailField = () => document.getElementById("email");
const dobField = () => document.getElementById("dob");
const nationalIdNumberField = () =>
  document.querySelector('[name="national_id_number"]');

// Step 2
const occupationField = () =>
  document.querySelector('[name="occupation"]');
const employeeNumberField = () =>
  document.querySelector('[name="employee_number"]');
const businessNumberField = () =>
  document.querySelector('[name="business_number"]');

// Step 3
const nationalIdFileField = () =>
  document.querySelector('[name="national_id"]');
const payslipField = () =>
  document.querySelector('[name="payslip"]');
const bankStatementField = () =>
  document.querySelector('[name="bank_statement"]');

// ==========================
// INITIALIZE
// ==========================
updateStepDisplay();
prefillUserDetails();

// ==========================
// PREFILL USER DATA
// ==========================
function prefillUserDetails() {
  fetch("http://localhost:3000/api/v1/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(user => {
      firstNameField().value = user.first_name || "";
      lastNameField().value = user.last_name || "";
      emailField().value = user.email || "";
    })
    .catch(() => {
      alert("Failed to load user details.");
    });
}

// ==========================
// NAVIGATION
// ==========================
nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;
  currentStep++;
  updateStepDisplay();
});

prevBtn.addEventListener("click", () => {
  if (currentStep > 1) {
    currentStep--;
    updateStepDisplay();
  }
});

// ==========================
// SUBMIT
// ==========================
submitBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!validateCurrentStep()) return;
  submitKYC();
});

// ==========================
// STEP DISPLAY
// ==========================
function updateStepDisplay() {
  stepIndicators.forEach(step => {
    step.classList.toggle(
      "active",
      Number(step.dataset.step) === currentStep
    );
  });

  stepContents.forEach(content => {
    content.classList.toggle(
      "active",
      content.id === `step${currentStep}`
    );
  });

  prevBtn.classList.toggle("hidden", currentStep === 1);

  if (currentStep === totalSteps) {
    nextBtn.classList.add("hidden");
    submitBtn.classList.remove("hidden");
  } else {
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
  }
}

// ==========================
// VALIDATION ROUTER
// ==========================
function validateCurrentStep() {
  if (currentStep === 1) return validateStep1();
  if (currentStep === 2) return validateStep2();
  if (currentStep === 3) return validateStep3();
  return true;
}

// ==========================
// STEP VALIDATIONS
// ==========================
function validateStep1() {
  if (!dobField().value) {
    alert("Date of birth is required");
    return false;
  }

  if (!nationalIdNumberField().value.trim()) {
    alert("National ID number is required");
    return false;
  }

  return true;
}

function validateStep2() {
  if (!occupationField().value.trim()) {
    alert("Occupation is required");
    return false;
  }
  return true;
}

function validateStep3() {
  if (!nationalIdFileField().files.length) {
    alert("National ID document is required");
    return false;
  }
  return true;
}

// ==========================
// API SUBMISSION (KYC ONLY)
// ==========================
function submitKYC() {
  const formData = new FormData();

  // Step 1
  formData.append("dob", dobField().value);
  formData.append(
    "national_id_number",
    nationalIdNumberField().value.trim()
  );

  // Step 2
  formData.append("occupation", occupationField().value.trim());

  if (employeeNumberField().value.trim()) {
    formData.append(
      "employee_number",
      employeeNumberField().value.trim()
    );
  }

  if (businessNumberField().value.trim()) {
    formData.append(
      "business_number",
      businessNumberField().value.trim()
    );
  }

  // Step 3
  formData.append("national_id", nationalIdFileField().files[0]);

  if (payslipField().files.length) {
    formData.append("payslip", payslipField().files[0]);
  }

  if (bankStatementField().files.length) {
    formData.append(
      "bank_statement",
      bankStatementField().files[0]
    );
  }

  fetch("http://localhost:3000/api/v1/kyc", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error.join(", "));
        return;
      }

      alert("KYC submitted successfully.");
      window.location.href = "index.html";
    })
    .catch(() => {
      alert("KYC submission failed. Please try again.");
    });
}
