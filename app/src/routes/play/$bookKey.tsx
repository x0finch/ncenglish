import { Button, Card, Chip, Modal } from "@heroui/react";
import catalog from "@nce/catalog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

function PlayPage() {
  const { bookKey } = Route.useParams();
  const { unit: unitFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mediaTime, setMediaTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  const activeLyric = catalog.activeLyricIndex(lyricLines, mediaTime);

  useEffect(() => {
    const el = document.getElementById(`lyric-line-${activeLyric}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeLyric]);

  const selectUnit = (idx: number) => {
    setUnitIndex(idx);
    void navigate({
      to: "/play/$bookKey",
      params: { bookKey },
      search: { unit: idx },
      replace: true,
    });
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

  return (
    <main className="nce-page-wrap px-4 pb-28 pt-4 md:grid md:max-w-7xl md:grid-cols-[minmax(260px,320px)_1fr] md:gap-8 md:pb-10">
      <audio
        ref={audioRef}
        className="hidden"
        controls={false}
        onTimeUpdate={(e) => setMediaTime(e.currentTarget.currentTime)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={onEnded}
      />

      <section className="mb-4 md:mb-0">
        <div className="mb-3 flex items-center justify-between gap-2 md:block">
          <h2 className="text-lg font-semibold">Units</h2>
          <Chip size="sm" className="md:mt-2">
            {units.length} lessons
          </Chip>
        </div>
        <ul className="max-h-[32vh] space-y-1 overflow-y-auto md:max-h-[calc(100vh-8rem)]">
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
      </section>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onPress={goPrev}>
            Prev
          </Button>
          <Button size="sm" onPress={goNext}>
            Next
          </Button>
          <Button size="sm" onPress={() => cyclePlaybackRate()}>
            {playbackRate}x
          </Button>
          <Button size="sm" onPress={() => cycleTrackPlayMode()}>
            {trackPlayMode === "repeatOne" ? "Repeat one" : "Sequential"}
          </Button>
          <Button size="sm" onPress={() => cycleTranslationMode()}>
            CC: {translationMode}
          </Button>
        </div>

        <Card className="mb-4 border border-[var(--line)] bg-[var(--surface-strong)] p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            {coverUrl ? (
              <div className="mx-auto shrink-0 overflow-hidden rounded-xl bg-[var(--chip-bg)] md:mx-0">
                <img
                  src={coverUrl}
                  alt=""
                  width={160}
                  height={213}
                  className="aspect-[3/4] w-36 object-cover sm:w-40"
                  decoding="async"
                  onError={(e) => {
                    e.currentTarget.parentElement?.remove();
                  }}
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 text-center md:text-left">
              <p className="text-sm opacity-70">{book?.title ?? bookKey}</p>
              <h1 className="mt-1 text-xl font-semibold md:text-2xl">
                {currentTitle}
              </h1>
            </div>
          </div>
          <div className="mt-4 hidden md:block">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={Math.min(mediaTime, duration || 0)}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                el.currentTime = Number(e.target.value);
              }}
              className="w-full accent-[var(--lagoon-deep)]"
            />
            <div className="mt-1 flex justify-between text-xs opacity-70">
              <span>{formatTime(mediaTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          <div className="mt-4 flex justify-center md:justify-start">
            <Button
              size="lg"
              onPress={() => {
                const el = audioRef.current;
                if (!el) return;
                if (el.paused) void el.play();
                else el.pause();
              }}
            >
              Play / Pause
            </Button>
          </div>
        </Card>

        <div className="min-h-[40vh] rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:min-h-[42vh]">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--kicker)]">
            Lyrics
          </h2>
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
      </section>

      {/* Narrow: fixed mini player */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[var(--line)] bg-[var(--header-bg)] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur md:hidden">
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
        <Button
          size="sm"
          onPress={() => {
            const el = audioRef.current;
            if (!el) return;
            if (el.paused) void el.play();
            else el.pause();
          }}
        >
          ▶
        </Button>
      </div>

      <MobileExpandedPlayer
        open={expanded}
        onOpenChange={setExpanded}
        audioRef={audioRef}
        mediaTime={mediaTime}
        duration={duration}
        currentTitle={currentTitle}
        bookTitle={book?.title ?? ""}
        coverUrl={coverUrl}
        onSeek={(t) => {
          const el = audioRef.current;
          if (el) el.currentTime = t;
        }}
      />
    </main>
  );
}

function MobileExpandedPlayer({
  open,
  onOpenChange,
  audioRef,
  mediaTime,
  duration,
  currentTitle,
  bookTitle,
  coverUrl,
  onSeek,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  mediaTime: number;
  duration: number;
  currentTitle: string;
  bookTitle: string;
  coverUrl: string | null;
  onSeek: (t: number) => void;
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
                    className="max-h-48 w-auto max-w-full rounded-xl object-contain shadow-sm"
                    decoding="async"
                  />
                </div>
              ) : null}
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.01}
                value={Math.min(mediaTime, duration || 0)}
                onChange={(e) => onSeek(Number(e.target.value))}
                className="w-full accent-[var(--lagoon-deep)]"
              />
              <div className="mt-2 flex justify-between text-xs opacity-70">
                <span>{formatTime(mediaTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close">Close</Button>
              <Button
                onPress={() => {
                  const el = audioRef.current;
                  if (!el) return;
                  if (el.paused) void el.play();
                  else el.pause();
                }}
              >
                Play / Pause
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
