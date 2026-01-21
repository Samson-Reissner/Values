// --- AUTH GUARD ---
const token = localStorage.getItem("authToken");
if (!token) window.location.replace("login.html");

// --- PREFILL DATE ---
document.getElementById("consent_date").value =
  new Date().toISOString().split("T")[0];

// --- ID FIELD LOGIC ---
const idFields = document.querySelectorAll(".id-field");
idFields.forEach(field => {
  field.addEventListener("input", () => {
    if (field.value.trim() !== "") {
      idFields.forEach(f => { if (f !== field) f.disabled = true; });
    } else {
      idFields.forEach(f => f.disabled = false);
    }
  });
});

// --- SUBMIT ENQUIRY ---
document.getElementById("submit_enquiry").addEventListener("click", () => {
  const payload = {
    consent_date: document.getElementById("consent_date").value,
    enquiry_reason: document.getElementById("enquiry_reason").value,
    client: {
      title: document.getElementById("title").value,
      first_name: document.getElementById("first_name").value,
      middle_name: document.getElementById("middle_name").value,
      last_name: document.getElementById("last_name").value,
      sex: document.getElementById("sex").value,
      dob: document.getElementById("dob").value,
      marital_status: document.getElementById("marital_status").value,
      profession: document.getElementById("profession").value,
      nationality: document.getElementById("nationality").value,
      phone: document.getElementById("phone").value,
      postal_address: document.getElementById("postal_address").value,
      district: document.getElementById("district").value,
      ids: {
        nid: document.getElementById("nid").value,
        passport: document.getElementById("passport").value,
        drivers: document.getElementById("drivers").value,
        traffic: document.getElementById("traffic").value,
        mec: document.getElementById("mec").value
      }
    }
  };

  fetch("http://localhost:3000/api/v1/credit_enquiries", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error("Failed");
    alert("Enquiry submitted successfully");
    window.location.href = "verified_customers.html";
  })
  .catch(() => alert("Error submitting enquiry"));
});
