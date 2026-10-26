(function () {
  "use strict";

  const styles = {
    anime: "high quality anime illustration, detailed anime character design, clean line art, vibrant colors, expressive eyes",
    realistic: "photorealistic photography, natural skin texture, realistic lighting, accurate anatomy, fine details",
    cinematic: "cinematic composition, dramatic lighting, film still, depth of field, detailed environment",
    fantasy: "fantasy concept art, magical atmosphere, intricate details, beautiful environment"
  };

  const translations = [
    [/chân thực|giống thật|người thật/gi, "photorealistic"],
    [/hoạt hình/gi, "cartoon"],
    [/dễ thương/gi, "cute"],
    [/toàn thân/gi, "full body"],
    [/chân dung/gi, "portrait"],
    [/rừng/gi, "forest"],
    [/thành phố/gi, "city"],
    [/ban đêm/gi, "at night"],
    [/ánh sáng/gi, "lighting"],
    [/một nhân vật/gi, "exactly one character"],
    [/không có người khác/gi, "no other people"]
  ];

  function optimize(prompt, style) {
    let result = String(prompt || "").trim();

    for (const [pattern, replacement] of translations) {
      result = result.replace(pattern, replacement);
    }

    const selectedStyle = styles[style] || styles.anime;

    return [
      result,
      selectedStyle,
      "high quality, detailed composition"
    ].filter(Boolean).join(", ");
  }

  window.VeltriaSmartPrompt = {
    optimize,
    styles
  };
})();
