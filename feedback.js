/* Minecraft2D Web — private feedback form.
 * Configure FORMSPREE_ENDPOINT with your Formspree form endpoint after creating it.
 */
(() => {
  "use strict";

  const FORMSPREE_ENDPOINT = "https://formspree.io/f/REPLACE_WITH_YOUR_FORM_ID";
  const toggle = document.getElementById("feedback-toggle");
  const panel = document.getElementById("feedback-panel");
  const form = document.getElementById("feedback-form");
  const submit = document.getElementById("feedback-submit");
  const status = document.getElementById("feedback-status");
  if (!toggle || !panel || !form || !submit || !status) return;

  const setStatus = (message, type = "") => {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");
    if (type) status.classList.add(type);
  };

  toggle.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));
    if (opening) {
      const firstField = form.querySelector("input[name='name']");
      if (firstField) firstField.focus({ preventScroll: true });
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const data = new FormData(form);
    if (String(data.get("website") || "").trim()) return;
    const message = String(data.get("message") || "").trim();
    if (message.length < 3) {
      setStatus("لطفاً پیام کامل‌تری بنویس.", "is-error");
      return;
    }
    data.set("message", message);
    data.set("_subject", "پیام جدید Minecraft2D Web — " + String(data.get("topic") || "نظر"));
    data.set("source", "Minecraft2D Web main menu");

    if (FORMSPREE_ENDPOINT.includes("REPLACE_WITH_YOUR_FORM_ID")) {
      setStatus("فرم آماده است؛ برای فعال شدن ارسال ایمیل، باید لینک اختصاصی Formspree را در تنظیمات این فایل قرار دهیم.", "is-error");
      return;
    }

    submit.disabled = true;
    submit.textContent = "در حال ارسال...";
    setStatus("در حال ارسال پیام...");
    try {
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" }
      });
      if (!response.ok) {
        let detail = "";
        try {
          const result = await response.json();
          detail = Array.isArray(result.errors) ? result.errors.map(item => item.message).join(" ") : "";
        } catch (_) {}
        throw new Error(detail || "ارسال پیام موفق نبود. دوباره تلاش کن.");
      }
      form.reset();
      setStatus("پیامت با موفقیت ارسال شد. ممنون از نظرت!", "is-success");
    } catch (error) {
      setStatus(error.message || "خطا در ارسال پیام. اتصال اینترنت را بررسی کن.", "is-error");
    } finally {
      submit.disabled = false;
      submit.textContent = "ارسال پیام";
    }
  });
})();
