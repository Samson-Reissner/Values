// --- AUTH GUARD ---
const token = localStorage.getItem("authToken");
if (!token) window.location.replace("login.html");

// --- PREFILL DATE ---
document.getElementById("consent_date").value =
  new Date().toISOString().split("T")[0];

// --- ID FIELD LOGIC (ONLY ONE ID ALLOWED) ---
const idFields = document.querySelectorAll(".id-field");
idFields.forEach(field => {
  field.addEventListener("input", () => {
    if (field.value.trim() !== "") {
      idFields.forEach(f => {
        if (f !== field) f.disabled = true;
      });
    } else {
      idFields.forEach(f => f.disabled = false);
    }
  });
});

// --- TOGGLE SECTIONS BASED ON ENQUIRY REASON ---
const enquirySelect = document.getElementById("enquiry_reason");
const credibilitySection = document.getElementById("credibility_section");
const creditedClientsSection = document.getElementById("credited_clients_section");

enquirySelect.addEventListener("change", () => {
  const value = enquirySelect.value;

  credibilitySection.style.display =
    value === "credibility_check" ? "block" : "none";

  creditedClientsSection.style.display =
    value === "view_credited_clients" ? "block" : "none";
});

// --- RENDER CREDITED CLIENTS ---
function renderCreditedClients(clients) {
  const container = document.getElementById("credited_clients_results");
  container.innerHTML = "";

  if (!clients || clients.length === 0) {
    container.innerHTML = "<p>No credited clients found.</p>";
    return;
  }

  clients.forEach(c => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <h4>${c.name}</h4>
      <p><strong>Phone:</strong> ${c.phone}</p>
      <p><strong>District:</strong> ${c.district}</p>
      <p><strong>Credit Status:</strong> ${c.credit_status.toUpperCase()}</p>
      <p><strong>Credit Score:</strong> ${c.credit_score}</p>
    `;

    container.appendChild(card);
  });
}

// --- SUBMIT ENQUIRY ---
document.getElementById("submit_enquiry").addEventListener("click", async () => {
  const reason = enquirySelect.value;

  if (!reason) {
    alert("Please select an enquiry reason");
    return;
  }

  const payload = {
    consent_date: document.getElementById("consent_date").value,
    enquiry_reason: reason
  };

  // -----------------------
  // CREDIBILITY CHECK
  // -----------------------
  if (reason === "credibility_check") {
    payload.client = {
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
    };
  }

  // -----------------------
  // VIEW CREDITED CLIENTS
  // -----------------------
  if (reason === "view_credited_clients") {
    payload.search_filters = {
      nid: document.getElementById("search_nid").value,
      phone: document.getElementById("search_phone").value,
      name: document.getElementById("search_name").value
    };
  }

  try {
    const res = await fetch("http://localhost:3000/api/v1/credit_enquiries", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Request failed");
    }

    // -----------------------
    // HANDLE RESPONSE
    // -----------------------
    if (reason === "view_credited_clients") {
      const data = await res.json();
      renderCreditedClients(data);
    } else {
      alert("Credibility check submitted successfully");
      window.location.href = "verified_customers.html";
    }

  } catch (err) {
    console.error("Error submitting enquiry:", err);
    alert("Error submitting enquiry. Check console for details.");
  }
});
