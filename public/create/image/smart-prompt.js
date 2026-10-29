(function () {
  "use strict";

  const styles = {
    anime: "2D anime illustration, clean line art, cel shading, vibrant colors",
    realistic: "photorealistic photograph, natural lighting, realistic textures, lifelike details",
    cinematic: "cinematic film still, dramatic lighting, realistic environment, depth of field",
    fantasy: "fantasy illustration, magical atmosphere, detailed environment, rich colors"
  };

  const characters = [
    {
      pattern: /\b(boa hancock|pirate empress)\b/i,
      description: "Boa Hancock from One Piece, long straight black hair, blue eyes, gold snake earrings, elegant pirate empress, original anime character design"
    },
    {
      pattern: /\b(nefertari vivi|princess vivi|vivi)\b/i,
      description: "Nefertari Vivi from One Piece, long wavy light blue hair, blue eyes, princess of Alabasta, original anime character design"
    },
    {
      pattern: /\b(shirahoshi|princess shirahoshi)\b/i,
      description: "Princess Shirahoshi from One Piece, giant mermaid princess, long flowing pink hair, large blue eyes, pink mermaid tail, original anime character design"
    },

    {
      pattern: /\b(naruto|uzumaki naruto)\b/i,
      description: "Naruto Uzumaki, spiky blond hair, blue eyes, three whisker marks on each cheek, orange and black ninja outfit, Hidden Leaf forehead protector"
    },
    {
      pattern: /\b(songoku|son goku|goku)\b/i,
      description: "Son Goku from Dragon Ball, spiky black hair, orange martial arts gi, blue undershirt, blue wristbands"
    },
    {
      pattern: /\b(luffy|monkey d luffy)\b/i,
      description: "Monkey D. Luffy, black hair, straw hat, red vest, blue shorts"
    }
  ];

  function optimize(prompt, style) {
    const original = String(prompt || "").trim();
    if (!original) return "";

    let result = original;

    for (const character of characters) {
      if (character.pattern.test(original)) {
        result = character.description + ', ' + original;
        break;
      }
    }

    const chibi = /\bchibi\b|dễ thương|cute/i.test(original);

    const vietnameseRules = [
      [/một nhân vật|chỉ một người/gi, "exactly one character"],
      [/toàn thân/gi, "full body"],
      [/chân dung/gi, "portrait"],
      [/trong rừng/gi, "in a forest"],
      [/ban đêm/gi, "at night"],
      [/đang chiến đấu/gi, "fighting pose"],
      [/đang cười/gi, "smiling"]
    ];

    if (result === original) {
      for (const [pattern, replacement] of vietnameseRules) {
        result = result.replace(pattern, replacement);
      }
    }

    const parts = [
      result,
      chibi ? "chibi style, small body, large head, cute proportions" : "",
      styles[style] || styles.anime,
      "high quality, detailed composition"
    ];

    if (/một nhân vật|chỉ một người|exactly one character/i.test(original)) {
      parts.push("solo character, no additional characters");
    }

    return parts.filter(Boolean).join(", ").slice(0, 1000);
  }

  window.VeltriaSmartPrompt = { optimize, styles };
})();
