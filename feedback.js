
"use strict";

(() => {
  const ENDPOINT = "https://formspree.io/f/mrpqblge";

  const toggle = document.getElementById("feedback-toggle");
  const panel = document.getElementById("feedback-panel");
  const form = document.getElementById("feedback-form");
  const submit = document.getElementById("feedback-submit");
  const status = document.getElementById("feedback-status");

  if (!toggle || !panel || !form || !submit || !status) return;

  function setStatus(message, type = "") {
    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (type) status.classList.add(type);
  }

  toggle.addEventListener("click", () => {
    const opening = panel.hidden;

    panel.hidden = !opening;
    toggle.setAttribute("aria-expanded", String(opening));

    if (opening) {
      form.querySelector('[name="name"]')
        ?.focus({ preventScroll: true });
    }
  });

  form.addEventListener("submit", async event => {
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
    data.set(
      "_subject",
      "پیام جدید Minecraft2D Web"
    );
    data.set("source", "Minecraft2D Web");

    submit.disabled = true;
    submit.textContent = "در حال ارسال...";

    setStatus("در حال اتصال به سرور ارسال پیام...");

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: {
          Accept: "application/json"
        },
        mode: "cors",
        credentials: "omit"
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        const details = Array.isArray(result.errors)
          ? result.errors.map(item => item.message).join(" ")
          : "";

        if (response.status === 404) {
          throw new Error("فرم Formspree پیدا نشد. شناسه فرم را بررسی کن.");
        }

        if (response.status === 422) {
          throw new Error(details || "اطلاعات فرم مورد قبول نیست.");
        }

        if (response.status === 429) {
          throw new Error("تعداد درخواست‌ها زیاد است. کمی بعد تلاش کن.");
        }

        throw new Error(
          details || `خطای سرور Formspree: ${response.status}`
        );
      }

      if (result.ok === false) {
        throw new Error("سرور ارسال پیام، درخواست را تأیید نکرد.");
      }

      form.reset();

      setStatus(
        "پیامت با موفقیت ارسال شد. ممنون از نظرت!",
        "is-success"
      );

    } catch (error) {
      console.error("[FEEDBACK ERROR]", error);

      setStatus(
        error instanceof TypeError
          ? "ارتباط با سرور برقرار نشد. اینترنت، فیلترشکن و دسترسی Formspree را بررسی کن."
          : error.message,
        "is-error"
      );

    } finally {
      submit.disabled = false;
      submit.textContent = "ارسال پیام";
    }
  });
})();
