import { NextRequest, NextResponse } from "next/server";

/**
 * Extrai o ID da playlist a partir de uma URL do YouTube.
 * Ex: https://www.youtube.com/playlist?list=PLxxx -> PLxxx
 *     https://youtube.com/watch?v=xxx&list=PLyyy -> PLyyy
 */
function extractPlaylistId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  // Já é um ID (começa com PL, OL, etc.)
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return trimmed;
  }
  const listMatch = trimmed.match(/[?&]list=([^&\s#]+)/);
  if (listMatch && listMatch[1]) {
    return listMatch[1];
  }
  return null;
}

export type PlaylistVideo = {
  videoId: string;
  url: string;
  title: string;
};

/**
 * GET /api/youtube/playlist?url=... ou ?playlistId=...
 * Retorna { videos: { videoId, url, title }[] }
 * Requer YOUTUBE_API_KEY no .env (YouTube Data API v3).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlParam = searchParams.get("url");
  const playlistIdParam = searchParams.get("playlistId");
  const input = urlParam ?? playlistIdParam ?? "";

  if (!input) {
    return NextResponse.json(
      { error: "Informe url ou playlistId" },
      { status: 400 }
    );
  }

  const playlistId = extractPlaylistId(input);
  if (!playlistId) {
    return NextResponse.json(
      { error: "URL ou ID da playlist inválido" },
      { status: 400 }
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "YOUTUBE_API_KEY não configurada. Configure no .env para buscar playlists.",
      },
      { status: 503 }
    );
  }

  const allVideos: PlaylistVideo[] = [];
  let nextPageToken: string | undefined;

  try {
    do {
      const params = new URLSearchParams({
        part: "snippet",
        playlistId,
        maxResults: "50",
        key: apiKey,
      });
      if (nextPageToken) {
        params.set("pageToken", nextPageToken);
      }

      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`,
        { next: { revalidate: 0 } }
      );

      if (!res.ok) {
        const body = await res.text();
        if (res.status === 403) {
          return NextResponse.json(
            {
              error:
                "YouTube API: acesso negado. Verifique a chave e se a API está habilitada.",
            },
            { status: 502 }
          );
        }
        return NextResponse.json(
          { error: `YouTube API: ${res.status} - ${body.slice(0, 200)}` },
          { status: 502 }
        );
      }

      const data = (await res.json()) as {
        items?: Array<{
          snippet?: {
            resourceId?: { videoId?: string };
            title?: string;
          };
        }>;
        nextPageToken?: string;
      };

      const items = data.items ?? [];
      for (const item of items) {
        const videoId = item.snippet?.resourceId?.videoId;
        if (videoId) {
          allVideos.push({
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: item.snippet?.title ?? "",
          });
        }
      }

      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    return NextResponse.json({ videos: allVideos });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar playlist";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
