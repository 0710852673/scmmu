/** Helpers for turning YouTube / Facebook watch URLs into embeddable player URLs. */

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1) || null;
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|live|shorts|v)\/([^/?#]+)/);
      if (m) return m[2];
      if (u.pathname.startsWith("/@")) return null; // channel URL — use channel embed
    }
  } catch {
    /* not a URL */
  }
  return null;
}

/** Channel handle (e.g. "Sivali_Central_College") for /@handle live embeds. */
export function youtubeChannelHandle(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.replace(/^www\./, "").endsWith("youtube.com")) return null;
    const m = u.pathname.match(/^\/@([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(url: string | null | undefined, opts?: { autoplay?: boolean }): string | null {
  const id = youtubeId(url);
  const params = `rel=0&modestbranding=1&playsinline=1${opts?.autoplay ? "&autoplay=1&mute=1" : ""}`;
  if (id) return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
  return null;
}

export function facebookEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.replace(/^www\./, "").includes("facebook.com")) return null;
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`;
  } catch {
    return null;
  }
}

export type EmbedSource = { kind: "youtube" | "facebook"; src: string };

/** Prefer YouTube; fall back to Facebook. */
export function resolveEmbed(
  youtube: string | null | undefined,
  facebook: string | null | undefined,
  opts?: { autoplay?: boolean },
): EmbedSource | null {
  const yt = youtubeEmbedUrl(youtube, opts);
  if (yt) return { kind: "youtube", src: yt };
  const fb = facebookEmbedUrl(facebook);
  if (fb) return { kind: "facebook", src: fb };
  return null;
}

export function youtubeThumb(url: string | null | undefined): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
