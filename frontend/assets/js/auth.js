function setAuthMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "auth-message";

  if (type) {
    element.classList.add(type);
  }
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return {
    message: "Please open this page through the Express backend server."
  };
}

function getFormPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function redirectAfterStudentAuth() {
  window.location.href = "student.html";
}

function initStudentSignup() {
  const form = document.getElementById("studentSignupForm");
  const message = document.getElementById("studentSignupMessage");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(message, "");

    const submitButton = form.querySelector('button[type="submit"]');
    const payload = getFormPayload(form);

    if (payload.password !== payload.confirmPassword) {
      setAuthMessage(message, "Passwords do not match.", "error");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Creating account...";
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to create account.");
      }

      setAuthMessage(message, "Account created. Redirecting...", "success");
      setTimeout(redirectAfterStudentAuth, 700);
    } catch (error) {
      setAuthMessage(message, error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Create Account";
      }
    }
  });
}

function initStudentLogin() {
  const form = document.getElementById("studentLoginForm");
  const message = document.getElementById("studentLoginMessage");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(message, "");

    const submitButton = form.querySelector('button[type="submit"]');
    const payload = getFormPayload(form);

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Logging in...";
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(data.message || "Unable to login.");
      }

      setAuthMessage(message, "Login successful. Redirecting...", "success");
      setTimeout(redirectAfterStudentAuth, 700);
    } catch (error) {
      setAuthMessage(message, error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Login";
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initStudentSignup();
  initStudentLogin();
});
