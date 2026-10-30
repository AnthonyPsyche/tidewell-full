// Progressive enhancement for forms: client-side validation with accessible errors, then a JSON post.
// Without JavaScript the form still posts normally and the server redirects to the confirmation page.
(() => {
  document.querySelectorAll("form[data-form]").forEach((form) => {
    const status = form.querySelector(".form-status");
    const ts = form.querySelector('input[name="_ts"]');
    if (ts) ts.value = String(Date.now());

    const setError = (field, msg) => {
      const wrap = field.closest(".field"); const err = wrap && wrap.querySelector(".field-error");
      if (!err) return;
      err.textContent = msg || ""; err.hidden = !msg; wrap.classList.toggle("invalid", !!msg);
      field.setAttribute("aria-invalid", msg ? "true" : "false");
    };
    const validate = (field) => {
      if (field.required && !field.value.trim()) { setError(field, "This field is required."); return false; }
      if (field.type === "email" && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) { setError(field, "Enter a valid email address."); return false; }
      setError(field, ""); return true;
    };
    form.querySelectorAll("input,select,textarea").forEach((f) => f.addEventListener("blur", () => { if (f.name && f.type !== "hidden" && !f.closest(".hp")) validate(f); }));

    form.addEventListener("submit", async (e) => {
      const fields = [...form.querySelectorAll("input:not([type=hidden]):not([tabindex='-1']),select,textarea")];
      const bad = fields.filter((f) => !validate(f));
      if (bad.length) { e.preventDefault(); bad[0].focus(); return; }
      if (!window.fetch) return; // fall back to a normal post
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]"); btn.disabled = true;
      status.hidden = false; status.classList.remove("error"); status.textContent = "Sending...";
      try {
        const res = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          if (data.redirect) { location.href = data.redirect; return; }
          form.reset(); status.textContent = data.message || "Thanks, your message was sent."; btn.disabled = false; return;
        }
        throw new Error(data.error || "Something went wrong. Please try again.");
      } catch (err) {
        status.classList.add("error"); status.textContent = err.message; btn.disabled = false;
        if (window.turnstile) window.turnstile.reset();
      }
    });
  });
})();
