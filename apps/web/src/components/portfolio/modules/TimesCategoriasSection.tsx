"use client";

import { useState, useEffect } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { PlayerItem, TeamCategory, PlayerSeasonHistory, PlayerSocialMedia } from "@/types/home-content";
import { AnimateInView } from "@/components/home/AnimateInView";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { SmartImage } from "@/components/common/SmartImage";
import { FIXTURE_CATEGORIES } from "@/lib/fixture-categories";
import { getPositionLabel } from "@/lib/football-positions";
import { X, Calendar, Ruler, Weight, Shirt, Trophy, TrendingUp, Video, Instagram, Twitter, Facebook, Youtube, Music, Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Meses abreviados em português
const MONTHS_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const PADDING_CLASSES = {
  minimal: { top: "pt-4 sm:pt-5", bottom: "pb-4 sm:pb-5" },
  compact: { top: "pt-6 sm:pt-8", bottom: "pb-6 sm:pb-8" },
  normal: { top: "pt-12 sm:pt-16", bottom: "pb-12 sm:pb-16" },
  large: { top: "pt-20 sm:pt-24", bottom: "pb-20 sm:pt-24" },
} as const;

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  // Se já está no formato dd/mmm/yyyy, retorna como está
  if (/^\d{1,2}\/[a-z]{3}\/\d{4}$/.test(dateStr)) return dateStr;
  // Se está no formato YYYY-MM-DD, converte
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-");
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx < 0 || monthIdx >= MONTHS_ABBR.length) return dateStr;
    return `${parseInt(day, 10)}/${MONTHS_ABBR[monthIdx]}/${year}`;
  }
  // Tenta parsear como Date
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const monthIdx = date.getMonth();
    const year = date.getFullYear();
    return `${day}/${MONTHS_ABBR[monthIdx]}/${year}`;
  } catch {
    return dateStr;
  }
}

function calculateAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

function isYouTubeUrl(url: string): boolean {
  return /youtube\.com|youtu\.be/.test(url);
}

function PlayerCard({
  player,
  onClick,
}: {
  player: PlayerItem;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/80 to-zinc-950/80 transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/10 hover:scale-[1.02]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {player.photoUrl ? (
          <SmartImage
            src={getPublicImageUrl(player.photoUrl)}
            alt={player.name}
            fill
            className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <Shirt className="h-16 w-16 text-zinc-600" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
        {player.jerseyNumber && (
          <div className="absolute top-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/90 text-lg font-bold text-zinc-950 shadow-lg">
            {player.jerseyNumber}
          </div>
        )}
      </div>
      <div className="p-4 min-h-[4.5rem]">
        <h3 className="font-semibold text-white line-clamp-1">{player.name}</h3>
        {player.position && (
          <p className="mt-1 text-xs text-amber-400/80 break-words line-clamp-2" title={getPositionLabel(player.position)}>
            {getPositionLabel(player.position)}
          </p>
        )}
      </div>
    </button>
  );
}

function PlayerModal({
  player,
  lang,
  open,
  onClose,
}: {
  player: PlayerItem | null;
  lang: "pt" | "en";
  open: boolean;
  onClose: () => void;
}) {
  const [watchVideoUrl, setWatchVideoUrl] = useState<string | null>(null);
  const watchYoutubeId = watchVideoUrl ? extractYouTubeId(watchVideoUrl) : null;

  if (!player || !open) return null;

  const age = calculateAge(player.birthDate);
  const bio = lang === "pt" ? player.bioPT : player.bioEN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm px-6 py-4">
          <h2 className="text-2xl font-bold text-white">{player.name}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
        <div className="mt-4 space-y-6">
          {/* Foto e informações principais */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10">
              {player.photoUrl ? (
                <SmartImage
                  src={getPublicImageUrl(player.photoUrl)}
                  alt={player.name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 300px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                  <Shirt className="h-24 w-24 text-zinc-600" />
                </div>
              )}
            </div>
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {player.position && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400">{lang === "pt" ? "Posição" : "Position"}</p>
                    <p className="mt-1 font-semibold text-white">{getPositionLabel(player.position)}</p>
                  </div>
                )}
                {player.jerseyNumber && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400">{lang === "pt" ? "Número" : "Number"}</p>
                    <p className="mt-1 font-semibold text-white">#{player.jerseyNumber}</p>
                  </div>
                )}
                {age !== null && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400">{lang === "pt" ? "Idade" : "Age"}</p>
                    <p className="mt-1 font-semibold text-white">{age} {lang === "pt" ? "anos" : "years"}</p>
                  </div>
                )}
                {player.nationality && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400">{lang === "pt" ? "Nacionalidade" : "Nationality"}</p>
                    <p className="mt-1 font-semibold text-white">{player.nationality}</p>
                  </div>
                )}
                {player.height && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {lang === "pt" ? "Altura" : "Height"}
                    </p>
                    <p className="mt-1 font-semibold text-white">{player.height} cm</p>
                  </div>
                )}
                {player.weight && (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <p className="text-xs text-zinc-400 flex items-center gap-1">
                      <Weight className="h-3 w-3" />
                      {lang === "pt" ? "Peso" : "Weight"}
                    </p>
                    <p className="mt-1 font-semibold text-white">{player.weight} kg</p>
                  </div>
                )}
              </div>
              {player.birthDate && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="text-xs text-zinc-400 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {lang === "pt" ? "Data de nascimento" : "Birth date"}
                  </p>
                  <p className="mt-1 font-semibold text-white">{formatDate(player.birthDate)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Biografia */}
          {bio && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-2 font-semibold text-white">{lang === "pt" ? "Biografia" : "Biography"}</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{bio}</p>
            </div>
          )}

          {/* Estatísticas */}
          {(player.matchesPlayed !== undefined || player.goals !== undefined || player.assists !== undefined) && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-4 font-semibold text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-amber-400" />
                {lang === "pt" ? "Estatísticas" : "Statistics"}
              </h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {player.matchesPlayed !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">{player.matchesPlayed}</p>
                    <p className="text-xs text-zinc-400 mt-1">{lang === "pt" ? "Jogos" : "Matches"}</p>
                  </div>
                )}
                {player.goals !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">{player.goals}</p>
                    <p className="text-xs text-zinc-400 mt-1">{lang === "pt" ? "Gols" : "Goals"}</p>
                  </div>
                )}
                {player.assists !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-400">{player.assists}</p>
                    <p className="text-xs text-zinc-400 mt-1">{lang === "pt" ? "Assistências" : "Assists"}</p>
                  </div>
                )}
                {player.yellowCards !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">{player.yellowCards}</p>
                    <p className="text-xs text-zinc-400 mt-1">{lang === "pt" ? "Amarelos" : "Yellows"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Histórico de Temporadas */}
          {player.seasonHistory && player.seasonHistory.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-4 font-semibold text-white">{lang === "pt" ? "Histórico de Temporadas" : "Season History"}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Ano" : "Year"}</th>
                      <th className="text-left py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Time" : "Team"}</th>
                      <th className="text-left py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Competição" : "Competition"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Partidas" : "Matches"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Início" : "Starts"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Substituições" : "Subs"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Gols" : "Goals"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Assistências" : "Assists"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Tempo" : "Time"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Amarelo" : "Yellow"}</th>
                      <th className="text-center py-2 px-3 text-zinc-400 font-medium">{lang === "pt" ? "Vermelho" : "Red"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {player.seasonHistory.map((season: PlayerSeasonHistory, idx) => (
                      <tr key={season.id ?? idx} className="border-b border-white/5 hover:bg-white/5">
                        <td className="py-2 px-3 text-white font-medium">{season.year}</td>
                        <td className="py-2 px-3 text-zinc-300">{season.team}</td>
                        <td className="py-2 px-3 text-zinc-300">{season.competition}</td>
                        <td className="py-2 px-3 text-center text-zinc-300">{season.matches ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-zinc-300">{season.starts ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-zinc-300">{season.substitutions ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-amber-400 font-semibold">{season.goals ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-amber-400 font-semibold">{season.assists ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-zinc-300">{season.minutesPlayed ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-yellow-400">{season.yellowCards ?? "-"}</td>
                        <td className="py-2 px-3 text-center text-red-400">{season.redCards ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Posição no Campo */}
          {player.fieldPosition && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-3 font-semibold text-white">{lang === "pt" ? "Posição no Campo" : "Field Position"}</h4>
              <div className="relative w-full max-w-md mx-auto aspect-[3/2] border-2 border-white/20 rounded-lg overflow-hidden bg-zinc-900">
                {/* Imagem real do campo de futebol */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/campo-futebol.png"
                  alt="Campo de futebol"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                
                {/* Marcador de posição - laranja com borda branca */}
                <div
                  className="absolute w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg z-10"
                  style={{
                    left: `${player.fieldPosition.x}%`,
                    top: `${player.fieldPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Redes Sociais */}
          {player.socialMedia && (player.socialMedia.instagram || player.socialMedia.twitter || player.socialMedia.facebook || player.socialMedia.tiktok || player.socialMedia.youtube || player.socialMedia.website) && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-3 font-semibold text-white">{lang === "pt" ? "Redes Sociais" : "Social Media"}</h4>
              <div className="flex flex-wrap gap-3">
                {player.socialMedia.instagram && (
                  <a
                    href={player.socialMedia.instagram.startsWith('http') ? player.socialMedia.instagram : `https://instagram.com/${player.socialMedia.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Instagram className="h-4 w-4" />
                    <span className="text-sm">Instagram</span>
                  </a>
                )}
                {player.socialMedia.twitter && (
                  <a
                    href={player.socialMedia.twitter.startsWith('http') ? player.socialMedia.twitter : `https://twitter.com/${player.socialMedia.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="text-sm">Twitter</span>
                  </a>
                )}
                {player.socialMedia.facebook && (
                  <a
                    href={player.socialMedia.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Facebook className="h-4 w-4" />
                    <span className="text-sm">Facebook</span>
                  </a>
                )}
                {player.socialMedia.tiktok && (
                  <a
                    href={player.socialMedia.tiktok.startsWith('http') ? player.socialMedia.tiktok : `https://tiktok.com/@${player.socialMedia.tiktok.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Music className="h-4 w-4" />
                    <span className="text-sm">TikTok</span>
                  </a>
                )}
                {player.socialMedia.youtube && (
                  <a
                    href={player.socialMedia.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Youtube className="h-4 w-4" />
                    <span className="text-sm">YouTube</span>
                  </a>
                )}
                {player.socialMedia.website && (
                  <a
                    href={player.socialMedia.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-white transition-all hover:scale-105 hover:shadow-lg"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="text-sm">{lang === "pt" ? "Site" : "Website"}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Melhores momentos */}
          {player.highlights && player.highlights.length > 0 && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h4 className="mb-3 font-semibold text-white flex items-center gap-2">
                <Video className="h-5 w-5 text-amber-400" />
                {lang === "pt" ? "Melhores momentos" : "Highlights"}
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {player.highlights.map((url, idx) => {
                  const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                  const isYouTube = isYouTubeUrl(url);
                  const youtubeId = isYouTube ? extractYouTubeId(url) : null;
                  
                  return (
                    <div key={idx} className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/10 group">
                      {isImage ? (
                        <SmartImage
                          src={getPublicImageUrl(url)}
                          alt={`${player.name} - ${lang === "pt" ? "Momento" : "Moment"} ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      ) : isYouTube && youtubeId ? (
                        <>
                          {/* Thumbnail do YouTube - clique abre player aqui */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                            alt={`${lang === "pt" ? "Vídeo do YouTube" : "YouTube video"}`}
                            className="absolute inset-0 w-full h-full object-cover cursor-pointer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors pointer-events-none" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-16 h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                              <Video className="h-8 w-8 text-white ml-1" />
                            </div>
                          </div>
                          {/* Clique na miniatura: assistir aqui */}
                          <button
                            type="button"
                            className="absolute inset-0 z-10"
                            onClick={() => setWatchVideoUrl(url)}
                            aria-label={lang === "pt" ? "Assistir vídeo" : "Watch video"}
                          />
                          {/* Botão no canto inferior: ir pro YouTube */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 z-20">
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-white text-sm font-medium hover:text-red-400 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Youtube className="h-4 w-4 shrink-0" />
                              <span className="truncate">{lang === "pt" ? "Abrir no YouTube" : "Open on YouTube"}</span>
                            </a>
                          </div>
                        </>
                      ) : (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 transition-colors"
                        >
                          <div className="text-center p-4">
                            <Video className="h-12 w-12 text-zinc-400 mx-auto mb-2" />
                            <p className="text-sm text-zinc-300">{lang === "pt" ? "Abrir vídeo" : "Open video"}</p>
                          </div>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Modal: assistir vídeo na miniatura (embed) + opção de ir pro YouTube */}
      {watchVideoUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setWatchVideoUrl(null)}
        >
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {watchYoutubeId ? (
              <iframe
                src={`https://www.youtube.com/embed/${watchYoutubeId}?autoplay=1`}
                title="Vídeo"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <a
                  href={watchVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  {lang === "pt" ? "Abrir vídeo" : "Open video"}
                </a>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 p-3 bg-gradient-to-t from-black/90 to-transparent">
              <a
                href={watchVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
              >
                <Youtube className="h-4 w-4" />
                {lang === "pt" ? "Abrir no YouTube" : "Open on YouTube"}
              </a>
              <button
                type="button"
                onClick={() => setWatchVideoUrl(null)}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-600 transition-colors"
              >
                {lang === "pt" ? "Fechar" : "Close"}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="absolute top-4 right-4 rounded-full p-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setWatchVideoUrl(null)}
            aria-label={lang === "pt" ? "Fechar" : "Close"}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  );
}

export function TimesCategoriasSection({
  block,
  slug,
  tenantId,
  lang,
  fullWidth,
  titleAlign = "left",
  inSection,
  showTitle = true,
}: {
  block: HomeContentBlock;
  slug?: string;
  tenantId?: string;
  lang: "pt" | "en";
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  showTitle?: boolean;
}) {
  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const padTop = (block.config?.timesCategoriasPaddingTop as keyof typeof PADDING_CLASSES) ?? "compact";
  const padBottom = (block.config?.timesCategoriasPaddingBottom as keyof typeof PADDING_CLASSES) ?? "compact";
  const bgColor = (block.config?.backgroundColor as string)?.trim();
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();

  const paddingTop = PADDING_CLASSES[padTop]?.top ?? PADDING_CLASSES.compact.top;
  const paddingBottom = PADDING_CLASSES[padBottom]?.bottom ?? PADDING_CLASSES.compact.bottom;
  const containerClass = fullWidth ? "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" : "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

  const [categories, setCategories] = useState<TeamCategory[]>([]);
  const hasTenant = !!(tenantId?.trim() || slug?.trim());
  const [loading, setLoading] = useState(hasTenant);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "all">("principal");

  // Dados do cadastro — usa tenantId (tenant da página) quando disponível; senão slug
  useEffect(() => {
    if (tenantId?.trim()) {
      setLoading(true);
      fetch(`/api/public/tenants/by-id/${encodeURIComponent(tenantId)}/players`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { categories: [] }))
        .then((data: { categories?: TeamCategory[] }) => {
          const cats = Array.isArray(data?.categories) ? data.categories : [];
          setCategories(cats);
          const hasPrincipal = cats.some((c) => (c as { id?: string }).id === "principal");
          setSelectedCategoryId(hasPrincipal ? "principal" : (cats[0]?.id ?? "all"));
        })
        .catch(() => setCategories([]))
        .finally(() => setLoading(false));
    } else if (slug?.trim()) {
      setLoading(true);
      fetch(`/api/public/tenants/${encodeURIComponent(slug)}/players`, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : { categories: [] }))
        .then((data: { categories?: TeamCategory[] }) => {
          const cats = Array.isArray(data?.categories) ? data.categories : [];
          setCategories(cats);
          const hasPrincipal = cats.some((c) => (c as { id?: string }).id === "principal");
          setSelectedCategoryId(hasPrincipal ? "principal" : (cats[0]?.id ?? "all"));
        })
        .catch(() => setCategories([]))
        .finally(() => setLoading(false));
    } else {
      setCategories([]);
      setLoading(false);
    }
  }, [tenantId, slug]);

  const handlePlayerClick = (player: PlayerItem) => {
    setSelectedPlayer(player);
    setModalOpen(true);
  };

  // Preparar categorias com nomes
  const categoriesWithNames = categories.map((category) => {
    let categoryName = lang === "pt" ? category.namePT : category.nameEN;
    if (!categoryName) {
      const fixedCat = FIXTURE_CATEGORIES.find((c) => c.value === category.id);
      if (fixedCat) {
        categoryName = lang === "pt" ? fixedCat.labelPT : fixedCat.labelEN;
      } else {
        categoryName = category.id;
      }
    }
    return { ...category, displayName: categoryName };
  });

  // Filtrar categoria selecionada
  const filteredCategories =
    selectedCategoryId === "all"
      ? categoriesWithNames
      : categoriesWithNames.filter((cat) => cat.id === selectedCategoryId);

  const hasPlayers = categoriesWithNames.some((c) => (c.players?.length ?? 0) > 0);

  return (
    <AnimateInView>
      <section
        id={block.id}
        className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${paddingTop} ${paddingBottom}`}
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {bgImage && (
          <div className="absolute inset-0">
            <SmartImage
              src={getPublicImageUrl(bgImage)}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
          </div>
        )}
        <div className={`relative ${containerClass}`}>
          {showTitle && (title || !hasPlayers) && (
            <SectionTitle
              title={title || (lang === "pt" ? "Times por Categorias" : "Teams by Category")}
              gradientStart={(block.config?.titleGradientStart as string)?.trim()}
              gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
              align={titleAlign ?? "left"}
            />
          )}

          {loading && (
            <p className="text-sm text-zinc-400 py-8">
              {lang === "pt" ? "Carregando atletas..." : "Loading players..."}
            </p>
          )}

          {!loading && !hasPlayers && (
            <p className="text-sm text-zinc-400 py-8">
              {lang === "pt"
                ? "Nenhum atleta visível. Cadastre em Futebol → Atletas (filtrando por este clube), use Sync da planilha para importar, e marque cada atleta como visível (ícone do olho)."
                : "No visible players. Add them in Players (filter by this club), use Sync to import from sheet, and mark each as visible (eye icon)."}
            </p>
          )}
          
          {/* Seletor de categoria - sempre visível */}
          {!loading && categoriesWithNames.length >= 1 && (
            <div className="mb-8 flex justify-start">
              <Select value={selectedCategoryId} onValueChange={(v) => setSelectedCategoryId(v)}>
                <SelectTrigger className="w-full max-w-xs bg-zinc-900/80 border-white/10 text-white">
                  <SelectValue placeholder={lang === "pt" ? "Selecione uma categoria" : "Select a category"} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="text-white focus:bg-zinc-800">
                    {lang === "pt" ? "Todas as categorias" : "All categories"}
                  </SelectItem>
                  {categoriesWithNames.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="text-white focus:bg-zinc-800">
                      {category.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!loading && hasPlayers && (
          <div className="space-y-12">
            {filteredCategories.map((category) => {
              const players = category.players?.filter((p) => p.name?.trim()) ?? [];
              if (players.length === 0) return null;

              return (
                <div key={category.id} className="space-y-6 w-full">
                  <h3 className="w-full text-left text-xl font-bold text-white sm:text-2xl">{category.displayName}</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {players.map((player, idx) => (
                      <PlayerCard key={player.id ?? idx} player={player} onClick={() => handlePlayerClick(player)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
        <PlayerModal player={selectedPlayer} lang={lang} open={modalOpen} onClose={() => setModalOpen(false)} />
      </section>
    </AnimateInView>
  );
}
