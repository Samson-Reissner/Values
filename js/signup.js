// js/signup.js

let currentStep = 1;
const totalSteps = 3;
let selectedUserType = "";

// DOM elements
const stepElements = document.querySelectorAll(".step");
const stepContentElements = document.querySelectorAll(".step-content");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");
const userTypeCards = document.querySelectorAll(".user-type-card");
const userTypeInput = document.getElementById("userType");
const employeeNumberInput = document.getElementById("employeeNumber");
const nonCivilWarning = document.getElementById("nonCivilWarning");
const civilSuccess = document.getElementById("civilSuccess");

// ==========================
// INITIALIZE
// ==========================
updateStepDisplay();

// ==========================
// USER TYPE SELECTION
// ==========================
userTypeCards.forEach(card => {
  card.addEventListener("click", () => {
    userTypeCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    selectedUserType = card.dataset.type;
    console.log("Selected user type:", selectedUserType); // Debug log
    userTypeInput.value = selectedUserType;
    
    // Update UI based on selection
    checkEmployeeNumber();
  });
});

// ==========================
// NAVIGATION
// ==========================
nextBtn.addEventListener("click", () => {
  if (!validateCurrentStep()) return;

  if (currentStep < totalSteps) {
    currentStep++;
    updateStepDisplay();
    
    // When moving to step 3, check employee number status
    if (currentStep === 3) {
      checkEmployeeNumber();
    }
  }
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
submitBtn.addEventListener("click", e => {
  e.preventDefault();

  if (!validateCurrentStep()) return;

  // Only allow civil servants with employee number to submit online
  if (selectedUserType === "CIVIL_SERVANT" && employeeNumberInput.value.trim()) {
    submitRegistration();
  } else {
    alert("Please visit our office to complete registration.");
  }
});

// ==========================
// FUNCTIONS
// ==========================
function updateStepDisplay() {
  // Update step indicators
  stepElements.forEach(step => {
    step.classList.toggle(
      "active",
      parseInt(step.dataset.step) === currentStep
    );
  });

  // Update step content
  stepContentElements.forEach(content => {
    content.classList.toggle(
      "active",
      content.id === `step${currentStep}`
    );
  });

  // Update button visibility
  prevBtn.classList.toggle("hidden", currentStep === 1);

  if (currentStep === totalSteps) {
    nextBtn.classList.add("hidden");
    // Show submit button only for civil servants with employee number
    const isCivilServantWithNumber = selectedUserType === "CIVIL_SERVANT" && employeeNumberInput.value.trim();
    submitBtn.classList.toggle("hidden", !isCivilServantWithNumber);
  } else {
    nextBtn.classList.remove("hidden");
    submitBtn.classList.add("hidden");
  }
}

function validateCurrentStep() {
  switch (currentStep) {
    case 1: return validateStep1();
    case 2: return validateStep2();
    case 3: return validateStep3();
    default: return true;
  }
}

// ==========================
// STEP VALIDATIONS
// ==========================
function validateStep1() {
  const firstName = firstNameField().value.trim();
  const lastName = lastNameField().value.trim();
  const email = emailField().value.trim();
  const password = passwordField().value;
  const confirm = confirmPasswordField().value;
  const dob = dobField().value;

  // Basic validations
  if (!firstName || !lastName) {
    alert("Please enter your first and last name");
    return false;
  }

  if (!email) {
    alert("Please enter your email address");
    return false;
  }

  if (!dob) {
    alert("Please enter your date of birth");
    return false;
  }

  if (password !== confirm) {
    alert("Passwords do not match");
    return false;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return false;
  }

  return true;
}

function validateStep2() {
  if (!selectedUserType) {
    alert("Please select a user category");
    return false;
  }
  return true;
}

function validateStep3() {
  if (!payslipField().files.length || !bankStatementField().files.length) {
    alert("Please upload required documents");
    return false;
  }
  
  // Additional validation for civil servants
  if (selectedUserType === "CIVIL_SERVANT" && !employeeNumberInput.value.trim()) {
    alert("Civil servants must provide an employee number");
    return false;
  }
  
  return true;
}

// ==========================
// EMPLOYEE NUMBER LOGIC
// ==========================
employeeNumberInput.addEventListener("input", checkEmployeeNumber);

function checkEmployeeNumber() {
  const hasEmployeeNumber = employeeNumberInput.value.trim() !== "";
  
  console.log("Checking employee number - User type:", selectedUserType, "Has number:", hasEmployeeNumber); // Debug log
  
  if (selectedUserType === "CIVIL_SERVANT") {
    if (hasEmployeeNumber) {
      // Civil servant with employee number - can submit online
      nonCivilWarning.style.display = "none";
      civilSuccess.style.display = "block";
      if (currentStep === totalSteps) {
        submitBtn.classList.remove("hidden");
      }
    } else {
      // Civil servant without employee number
      nonCivilWarning.style.display = "none";
      civilSuccess.style.display = "none";
      submitBtn.classList.add("hidden");
    }
  } else {
    // Non-civil servant
    nonCivilWarning.style.display = "block";
    civilSuccess.style.display = "none";
    submitBtn.classList.add("hidden");
  }
}

// ==========================
// API SUBMISSION
// ==========================
function submitRegistration() {
  const formData = new FormData();

  // Add form data
  formData.append("first_name", firstNameField().value.trim());
  formData.append("last_name", lastNameField().value.trim());
  formData.append("email", emailField().value.trim());
  formData.append("password", passwordField().value);
  formData.append("password_confirmation", confirmPasswordField().value);
  formData.append("dob", dobField().value);
  formData.append("user_type", selectedUserType);
  formData.append("employee_number", employeeNumberInput.value.trim());
  
  // Add business number if exists
  const businessNumber = businessNumberField().value.trim();
  if (businessNumber) {
    formData.append("business_number", businessNumber);
  }

  // Add file uploads
  formData.append("payslip", payslipField().files[0]);
  formData.append("bank_statement", bankStatementField().files[0]);

  console.log("Submitting signup form...");

  fetch("http://localhost:3000/api/v1/register", {
    method: "POST",
    body: formData
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      return res.json();
    })
    .then(data => {
      console.log("Signup response:", data);

      if (data.error) {
        alert(data.error.join(", "));
        return;
      }

      if (data.message) {
        alert(data.message);
      } else {
        alert("Registration successful!");
      }
      
      window.location.href = "login.html";
    })
    .catch(err => {
      console.error("Signup failed:", err);
      alert("Registration failed. Please try again.");
    });
}

// Support contact function
function contactSupport() {
  alert("Please call our customer service at 0800-VALUE-LOAN (0800 82583 5626) or visit our website for office locations.");
}

// ==========================
// DOM HELPERS
// ==========================
const firstNameField = () => document.getElementById("firstName");
const lastNameField = () => document.getElementById("lastName");
const emailField = () => document.getElementById("email");
const passwordField = () => document.getElementById("password");
const confirmPasswordField = () => document.getElementById("confirmPassword");
const dobField = () => document.getElementById("dob");
const payslipField = () => document.getElementById("payslip");
const bankStatementField = () => document.getElementById("bankStatement");
const businessNumberField = () => document.getElementById("businessNumber");