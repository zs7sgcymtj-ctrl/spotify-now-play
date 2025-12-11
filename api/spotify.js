// api/spotify.js

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

async function getAccessToken() {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to get access token: " + errorText);
  }

  const data = await response.json();
  return data.access_token;
}

async function getNowPlaying(accessToken) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  // 204 = nothing is playing
  if (response.status === 204 || response.status === 202) {
    return { isPlaying: false };
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to get currently playing: " + errorText);
  }

  const data = await response.json();

  if (!data || !data.item) {
    return { isPlaying: false };
  }

  const item = data.item;

  return {
    isPlaying: data.is_playing,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    albumArt: item.album.images?.[0]?.url ?? null,
    url: item.external_urls?.spotify ?? null,
  };
}

export default async function handler(req, res) {
  try {
    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(500).json({
        error: "Missing Spotify env vars",
      });
    }

    const accessToken = await getAccessToken();
    const nowPlaying = await getNowPlaying(accessToken);

    res.setHeader("Access-Control-Allow-Origin", "*"); // so Framer can call it
    return res.status(200).json(nowPlaying);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
}
