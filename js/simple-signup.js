// js/simple-signup.js

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Basic validation
    if (!firstName || !lastName || !phone || !email || !password || !confirmPassword) {
      alert("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    // Payload sent to Rails
    const payload = {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      password: password,
      confirmPassword: confirmPassword
    };

    try {
      const response = await fetch("http://localhost:3000/api/v1/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert((data.errors || data.error || ["Signup failed"]).join(", "));
        return;
      }

      alert("Account created successfully!");
      window.location.href = "login.html";

    } catch (error) {
      console.error("Signup error:", error);
      alert("Unable to connect to server. Please try again.");
    }
  });
});
