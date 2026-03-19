const API_BASE_URL = "https://www.googleapis.com/youtube/v3";

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export async function fetchPlaylistVideos() {
  const apiKey = getRequiredEnv("YOUTUBE_API_KEY");
  const playlistId = getRequiredEnv("YOUTUBE_PLAYLIST_ID");
  const videos = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      key: apiKey,
      part: "snippet",
      maxResults: "50",
      playlistId,
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await fetch(`${API_BASE_URL}/playlistItems?${params}`, {
      next: { revalidate: 0 },
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "YouTube playlist fetch failed.");
    }

    const pageVideos = (data.items || [])
      .map((item) => {
        const videoId = item.snippet?.resourceId?.videoId;

        if (!videoId) {
          return null;
        }

        return {
          videoId,
          title: item.snippet?.title || "Untitled video",
          thumbnail:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        };
      })
      .filter(Boolean);

    videos.push(...pageVideos);
    pageToken = data.nextPageToken || "";
  } while (pageToken);

  return videos;
}

export async function searchYoutubeVideos(query) {
  const apiKey = getRequiredEnv("YOUTUBE_API_KEY");
  const params = new URLSearchParams({
    key: apiKey,
    part: "snippet",
    maxResults: "1",
    q: query,
    type: "video",
    videoEmbeddable: "true",
  });

  const response = await fetch(`${API_BASE_URL}/search?${params}`, {
    next: { revalidate: 0 },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "YouTube search failed.");
  }

  const item = data.items?.[0];

  if (!item?.id?.videoId) {
    return null;
  }

  return {
    videoId: item.id.videoId,
    title: item.snippet?.title || "Untitled video",
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
  };
}

export function extractVideoId(input) {
  if (!input) {
    return "";
  }

  const trimmed = input.trim();
  const directMatch = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directMatch) {
    return directMatch[0];
  }

  try {
    const url = new URL(trimmed);

    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "").slice(0, 11);
    }

    return url.searchParams.get("v") || "";
  } catch {
    return "";
  }
}
