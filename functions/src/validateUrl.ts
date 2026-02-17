import * as https from "https";
import * as http from "http";

const TIKTOK_VIDEO_RE = /\/video\/(\d+)/;

/**
 * Follows HTTP redirects using GET (more reliable than HEAD with TikTok's CDN).
 * Destroys the response body immediately — we only need the Location header.
 */
function followRedirects(url: string, maxRedirects = 10): Promise<string> {
  return new Promise((resolve, reject) => {
    if (maxRedirects === 0) {
      resolve(url);
      return;
    }
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: {
          // Mimic a browser so TikTok doesn't reject the request
          "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        },
      },
      (res) => {
        // Drain/destroy the body — we don't need it
        res.destroy();

        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const location = res.headers.location;
          const next = location.startsWith("http")
            ? location
            : new URL(location, url).href;
          followRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
        } else {
          resolve(url);
        }
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("Timeout resolving URL"));
    });
    req.end();
  });
}

export interface ValidatedUrl {
  resolvedUrl: string;
  videoId: string;
}

/**
 * Validates that the input is a TikTok URL.
 * Resolves redirects and extracts the numeric video ID.
 */
export async function validateTikTokUrl(rawUrl: string): Promise<ValidatedUrl> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("Invalid URL format.");
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (!["tiktok.com", "vm.tiktok.com", "vt.tiktok.com"].includes(hostname)) {
    throw new Error("URL must be a TikTok link.");
  }

  // Always try to resolve redirects for any TikTok URL that doesn't already
  // have a numeric video ID in it (covers vm.tiktok.com, vt.tiktok.com,
  // and the newer www.tiktok.com/t/XXXXX format from the Share → Copy link button)
  let resolved = rawUrl.trim();
  if (!TIKTOK_VIDEO_RE.test(resolved)) {
    try {
      resolved = await followRedirects(resolved);
    } catch (err) {
      // If redirect following fails, still try to extract ID from the original URL
      resolved = rawUrl.trim();
    }
  }

  // Extract video ID
  const match = resolved.match(TIKTOK_VIDEO_RE);
  if (!match) {
    throw new Error(
      `Could not find the video ID in this TikTok link.\n` +
      `Resolved to: ${resolved}\n` +
      `Try copying the link again from TikTok's Share → Copy link button.`
    );
  }

  return { resolvedUrl: resolved, videoId: match[1] };
}
