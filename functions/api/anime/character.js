export async function onRequestGet({ request }) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  };

  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers });

  const url = new URL(request.url);
  const name = (url.searchParams.get("name") || "").trim();

  if (name.length < 2 || name.length > 100) {
    return reply({ ok: false, error: "INVALID_NAME" }, 400);
  }

  const query = `
    query ($name: String) {
      Character(search: $name) {
        id
        name { full }
        image { large }
        siteUrl
      }
    }
  `;

  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: { name }
      })
    });

    if (!response.ok) {
      return reply({
        ok: false,
        error: "ANILIST_UNAVAILABLE"
      }, 502);
    }

    const data = await response.json();
    const character = data?.data?.Character;

    if (!character) {
      return reply({
        ok: false,
        error: "CHARACTER_NOT_FOUND"
      }, 404);
    }

    return reply({
      ok: true,
      character: {
        id: character.id,
        name: character.name.full,
        image: character.image?.large || null,
        url: character.siteUrl || null
      }
    });
  } catch {
    return reply({
      ok: false,
      error: "CHARACTER_LOOKUP_FAILED"
    }, 502);
  }
}
