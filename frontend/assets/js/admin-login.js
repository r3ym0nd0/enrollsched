document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("adminLoginForm");
  const message = document.getElementById("adminLoginMessage");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "auth-message";

    const formData = new FormData(form);
    const credentials = {
      adminId: formData.get("adminId"),
      password: formData.get("password")
    };

    try {
      const response = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { message: "Admin login must be opened through the Express backend server." };

      if (!response.ok) {
        throw new Error(data.message || "Unable to login.");
      }

      window.location.href = "admin.html";
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
    }
  });
});
