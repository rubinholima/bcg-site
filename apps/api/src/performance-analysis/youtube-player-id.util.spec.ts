function extractYoutubeVideoId(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  const m =
    u.match(/[?&]v=([\w-]{11})/) ||
    u.match(/youtu\.be\/([\w-]{11})/) ||
    u.match(/embed\/([\w-]{11})/);
  return m?.[1] ?? null;
}

describe('youtube player id', () => {
  it('extrai id de url watch', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('não retorna zero como tempo fictício', () => {
    expect(extractYoutubeVideoId('')).toBeNull();
  });
});
