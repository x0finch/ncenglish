import { Button, Card, Chip, Modal } from "@heroui/react";
import catalog from "@nce/catalog";
import type { LyricLine } from "@nce/catalog";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PlayerTransportControls,
  type PlayerTransportControlsProps,
} from "../../features/player/player-transport.tsx";
import { useNceStore } from "../../features/player/nce-store.ts";
import { logMediaInfo, logMediaWarn } from "../../lib/client-media-log.ts";

export const Route = createFileRoute("/play/$bookKey")({
  validateSearch: (raw: Record<string, unknown>) => {
    const u = raw.unit;
    const n = u != null ? Number(u) : undefined;
    return {
      unit: n != null && Number.isFinite(n) ? n : undefined,
    };
  },
  component: PlayPage,
});

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayPage() {
  const { bookKey } = Route.useParams();
  const { unit: unitFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mediaTime, setMediaTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(true);

  const unitIndex = useNceStore((s) => s.unitIndex);
  const trackPlayMode = useNceStore((s) => s.trackPlayMode);
  const playbackRate = useNceStore((s) => s.playbackRate);
  const translationMode = useNceStore((s) => s.translationMode);
  const lyricLines = useNceStore((s) => s.lyricLines);
  const lyricsStatus = useNceStore((s) => s.lyricsStatus);
  const lyricsError = useNceStore((s) => s.lyricsError);

  const setUnitIndex = useNceStore((s) => s.setUnitIndex);
  const goNext = useNceStore((s) => s.goNext);
  const goPrev = useNceStore((s) => s.goPrev);
  const onAudioEnded = useNceStore((s) => s.onAudioEnded);
  const loadLyricsForCurrentUnit = useNceStore(
    (s) => s.loadLyricsForCurrentUnit,
  );
  const cyclePlaybackRate = useNceStore((s) => s.cyclePlaybackRate);
  const cycleTrackPlayMode = useNceStore((s) => s.cycleTrackPlayMode);
  const cycleTranslationMode = useNceStore((s) => s.cycleTranslationMode);

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    useNceStore.getState().setBook(bookKey, unitFromUrl);
  }, [bookKey, unitFromUrl]);

  useEffect(() => {
    const idx = useNceStore.getState().unitIndex;
    void navigate({
      to: "/play/$bookKey",
      params: { bookKey },
      search: { unit: idx },
      replace: true,
    });
  }, [bookKey, unitIndex, navigate]);

  useEffect(() => {
    void loadLyricsForCurrentUnit();
  }, [bookKey, unitIndex, loadLyricsForCurrentUnit]);

  const bindAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const book = catalog.getBook(bookKey);
    if (!book) {
      logMediaWarn("audio.skip_no_book", { bookKey });
      return;
    }
    const units = catalog.listUnits(bookKey);
    const u = units[unitIndex];
    if (!u) {
      logMediaWarn("audio.skip_no_unit", { bookKey, unitIndex });
      return;
    }
    try {
      const { audioUrl } = catalog.getUnitMedia(bookKey, u.entry);
      logMediaInfo("audio.set_src", {
        bookKey,
        unit: u.entry,
        audioUrl,
        playbackRate,
      });
      if (el.src !== audioUrl) {
        el.src = audioUrl;
        void el.play().catch((err) => {
          logMediaWarn("audio.play_rejected", {
            audioUrl,
            message: err instanceof Error ? err.message : String(err),
          });
        });
      }
      el.playbackRate = playbackRate;
    } catch (e) {
      logMediaWarn("audio.getUnitMedia_failed", {
        bookKey,
        unit: u.entry,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }, [bookKey, unitIndex, playbackRate]);

  useEffect(() => {
    bindAudio();
  }, [bindAudio]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onError = () => {
      const err = el.error;
      logMediaWarn("audio.element_error", {
        src: el.currentSrc || el.src,
        code: err?.code,
        message: err?.message,
        hint: "MEDIA_ERR_SRC_NOT_SUPPORTED(4) often means 404, CORS, or wrong Content-Type from the media host",
      });
    };
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [bookKey, unitIndex]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const sync = () => setPaused(el.paused);
    sync();
    el.addEventListener("play", sync);
    el.addEventListener("pause", sync);
    return () => {
      el.removeEventListener("play", sync);
      el.removeEventListener("pause", sync);
    };
  }, [bookKey, unitIndex]);

  const activeLyric = catalog.activeLyricIndex(lyricLines, mediaTime);

  useEffect(() => {
    const el = document.getElementById(`lyric-line-${activeLyric}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLyric]);

  const selectUnit = (idx: number) => {
    setUnitIndex(idx);
  };

  const onEnded = () => {
    const res = onAudioEnded();
    const el = audioRef.current;
    if (!el) return;
    if (res.action === "replay") {
      el.currentTime = 0;
      void el.play();
    }
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const onSeek = (t: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = t;
  };

  const book = catalog.getBook(bookKey);
  const units = book ? catalog.listUnits(bookKey) : [];
  const currentTitle =
    units[unitIndex]?.entry.replace(/\.[^.]+$/, "") ?? "—";

  let coverUrl: string | null = null;
  try {
    coverUrl = catalog.getBookCoverUrl(bookKey);
  } catch {
    coverUrl = null;
  }

  const transportProps = {
    mediaTime,
    duration,
    onSeek,
    paused,
    onTogglePlay: togglePlay,
    onPrev: goPrev,
    onNext: goNext,
    playbackRate,
    onCyclePlaybackRate: cyclePlaybackRate,
    trackPlayMode,
    onCycleTrackPlayMode: cycleTrackPlayMode,
    onCycleTranslationMode: cycleTranslationMode,
  };

  const bottomPad =
    "pb-[calc(7.5rem+env(safe-area-inset-bottom))] lg:pb-[calc(10.5rem+env(safe-area-inset-bottom))]";

  return (
    <main
      className={`flex min-h-0 flex-1 flex-col px-4 pt-4 ${bottomPad} lg:h-[calc(100dvh-var(--app-header-height))] lg:max-h-[calc(100dvh-var(--app-header-height))] lg:flex-none lg:overflow-hidden`}
    >
      <audio
        ref={audioRef}
        className="hidden"
        controls={false}
        onTimeUpdate={(e) => setMediaTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onEnded={onEnded}
      />

      <div
        className="nce-page-wrap flex min-h-0 flex-1 flex-col gap-4 lg:max-w-[1600px] lg:min-h-0 lg:flex-1 lg:grid lg:grid-cols-[minmax(200px,280px)_minmax(0,1fr)] lg:gap-6 lg:overflow-hidden"
      >
        <aside className="flex min-h-0 flex-col gap-4 lg:min-h-0 lg:overflow-hidden lg:border-r lg:border-[var(--line)] lg:pr-4">
          <Card className="shrink-0 border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-sm">
            <Link
              to="/library"
              className="mb-3 inline-block text-sm font-medium text-[var(--lagoon-deep)] underline-offset-2 hover:underline"
            >
              Back to library
            </Link>
            <div className="flex gap-3">
              {coverUrl ? (
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--chip-bg)]">
                  <img
                    src={coverUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.parentElement?.remove();
                    }}
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-3 text-sm font-semibold leading-snug">
                  {book?.title ?? bookKey}
                </p>
                {book ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Chip size="sm">{book.bookLevel}</Chip>
                    <Chip size="sm" variant="soft">
                      {units.length} lessons
                    </Chip>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="mt-3 border-t border-[var(--line)] pt-3">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--kicker)]">
                Now playing
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">
                {currentTitle}
              </p>
            </div>
          </Card>
          <div className="flex min-h-[22vh] flex-1 flex-col lg:min-h-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--kicker)]">
              Lessons
            </h2>
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1">
              {units.map((u) => (
                <li key={u.entry}>
                  <button
                    type="button"
                    onClick={() => selectUnit(u.index)}
                    className={
                      u.index === unitIndex
                        ? "w-full rounded-lg border border-[var(--lagoon-deep)] bg-[color-mix(in_oklab,var(--lagoon)_18%,transparent)] px-3 py-2.5 text-left text-sm font-medium"
                        : "w-full rounded-lg border border-transparent px-3 py-2.5 text-left text-sm opacity-90 hover:bg-[var(--surface-strong)]"
                    }
                  >
                    {u.entry}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 lg:min-h-0 lg:p-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:p-5">
            <LyricsColumn
              lyricsStatus={lyricsStatus}
              lyricsError={lyricsError}
              lyricLines={lyricLines}
              activeLyric={activeLyric}
              translationMode={translationMode}
            />
          </div>
        </div>
      </div>

      {/* Desktop: full-width transport */}
      <div className="fixed inset-x-0 bottom-0 z-40 hidden border-t border-[var(--line)] bg-[var(--header-bg)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:block">
        <div className="nce-page-wrap mx-auto max-w-[1600px] px-4 py-3">
          <PlayerTransportControls {...transportProps} />
        </div>
      </div>

      {/* Mobile: mini bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[var(--line)] bg-[var(--header-bg)]/95 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setExpanded(true)}
        >
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--chip-bg)]">
            {coverUrl ? (
              <img
                src={coverUrl}
                alt=""
                className="h-full w-full object-cover"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.remove();
                }}
              />
            ) : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{currentTitle}</p>
            <p className="truncate text-xs opacity-60">{book?.title}</p>
          </div>
        </button>
        <Button size="sm" onPress={togglePlay}>
          {paused ? "Play" : "Pause"}
        </Button>
      </div>

      <MobileExpandedPlayer
        open={expanded}
        onOpenChange={setExpanded}
        transportProps={transportProps}
        currentTitle={currentTitle}
        bookTitle={book?.title ?? ""}
        coverUrl={coverUrl}
      />
    </main>
  );
}

function LyricsColumn({
  lyricsStatus,
  lyricsError,
  lyricLines,
  activeLyric,
  translationMode,
}: {
  lyricsStatus: "idle" | "loading" | "error" | "ready";
  lyricsError: string | null;
  lyricLines: readonly LyricLine[];
  activeLyric: number;
  translationMode: "show" | "hide" | "blur";
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="mb-3 shrink-0 text-sm font-semibold uppercase tracking-wide text-[var(--kicker)]">
        Line by line
      </h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {lyricsStatus === "loading" && (
          <p className="text-sm opacity-70">Loading lyrics…</p>
        )}
        {lyricsStatus === "error" && (
          <p className="text-sm text-red-600/90">{lyricsError}</p>
        )}
        {lyricsStatus === "ready" && lyricLines.length === 0 && (
          <p className="text-sm opacity-70">No lyric lines.</p>
        )}
        <ul className="space-y-2">
          {lyricLines.map((line, i) => (
            <li
              key={`${line.timeSec}-${line.english.slice(0, 24)}`}
              id={`lyric-line-${i}`}
              className={
                i === activeLyric
                  ? "font-semibold text-[var(--lagoon-deep)]"
                  : "opacity-80"
              }
            >
              <span className="text-xs opacity-50 tabular-nums">
                {formatTime(line.timeSec)}
              </span>
              <div>{line.english}</div>
              {translationMode !== "hide" && line.chinese ? (
                <div
                  className={
                    translationMode === "blur"
                      ? "mt-0.5 blur-sm transition hover:blur-none"
                      : "mt-0.5 text-sm opacity-75"
                  }
                >
                  {line.chinese}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MobileExpandedPlayer({
  open,
  onOpenChange,
  transportProps,
  currentTitle,
  bookTitle,
  coverUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transportProps: PlayerTransportControlsProps;
  currentTitle: string;
  bookTitle: string;
  coverUrl: string | null;
}) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <Modal.Container placement="bottom" scroll="inside" size="cover">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{currentTitle}</Modal.Heading>
              <p className="text-sm opacity-70">{bookTitle}</p>
            </Modal.Header>
            <Modal.Body>
              {coverUrl ? (
                <div className="mb-4 flex justify-center">
                  <img
                    src={coverUrl}
                    alt=""
                    className="max-h-40 w-auto max-w-full rounded-xl object-contain shadow-sm"
                    decoding="async"
                  />
                </div>
              ) : null}
              <PlayerTransportControls {...transportProps} />
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close">Close</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
