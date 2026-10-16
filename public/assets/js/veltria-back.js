(() => {
  const fallback = "/create/";

  document.querySelectorAll('a.back').forEach(link => {
    link.textContent = "← Quay lại";
    link.href = fallback;

    link.addEventListener("click", event => {
      try {
        if (!document.referrer) return;

        const previous = new URL(document.referrer);

        if (
          previous.origin === location.origin &&
          previous.pathname !== location.pathname &&
          previous.pathname !== "/aurora/" &&
          previous.pathname !== "/obsidian/"
        ) {
          event.preventDefault();
          location.assign(previous.href);
        }
      } catch (error) {
        // Nếu không xác định được trang trước, dùng /create/.
      }
    });
  });
})();
