/**
 * Finds a real photo of a recommended place on Wikipedia / Wikimedia Commons
 * (free, no API key). Tries the place itself first, then its neighborhood.
 * Returns null when nothing trustworthy turns up.
 */

const UA = "SpotFinderNYC/1.0 (Columbia class project; contact via GitHub jieyishang7)";

export type PlacePhoto = { url: string; sourceUrl: string; source: "Wikipedia" | "Wikimedia Commons"; kind: "place" | "area" };

const STOP = new Set(["the", "and", "of", "at", "in", "nyc", "new", "york", "cafe", "café", "restaurant", "bar", "shop", "&", "-"]);

function words(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]s\b/g, "")
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

/** True when most of the place's distinctive words appear in the title. */
function matches(name: string, title: string) {
  const wanted = words(name);
  if (wanted.length === 0) return false;
  const have = new Set(words(title));
  const hits = wanted.filter((w) => have.has(w)).length;
  return hits >= Math.max(1, Math.ceil(wanted.length * 0.6));
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(url, { headers: { "User-Agent": UA, "Api-User-Agent": UA }, signal: controller.signal, cache: "no-store" });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

type WikiPage = { title: string; index?: number; fullurl?: string; thumbnail?: { source: string } };

async function fromWikipedia(query: string, mustMatch: string): Promise<PlacePhoto | null> {
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*" +
    `&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=5` +
    "&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=900&pilicense=any";
  const body = (await getJson(url)) as { query?: { pages?: WikiPage[] } } | null;
  const pages = (body?.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const page = pages.find((p) => p.thumbnail?.source && matches(mustMatch, p.title));
  if (!page?.thumbnail) return null;
  return { url: page.thumbnail.source, sourceUrl: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`, source: "Wikipedia", kind: "place" };
}

type CommonsPage = { title: string; index?: number; imageinfo?: { thumburl?: string; descriptionurl?: string; mime?: string }[] };

async function fromCommons(query: string, mustMatch: string): Promise<PlacePhoto | null> {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*" +
    `&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=8` +
    "&prop=imageinfo&iiprop=url|mime&iiurlwidth=900";
  const body = (await getJson(url)) as { query?: { pages?: CommonsPage[] } } | null;
  const pages = (body?.query?.pages ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const page = pages.find((p) => {
    const info = p.imageinfo?.[0];
    return info?.thumburl && /image\/(jpeg|png|webp)/.test(info.mime ?? "") && matches(mustMatch, p.title.replace(/^File:/, ""));
  });
  const info = page?.imageinfo?.[0];
  if (!page || !info?.thumburl) return null;
  return { url: info.thumburl, sourceUrl: info.descriptionurl ?? "https://commons.wikimedia.org", source: "Wikimedia Commons", kind: "place" };
}

export async function findPlacePhoto(name: string, area?: string | null): Promise<PlacePhoto | null> {
  const cleanArea = (area ?? "").split(/[,/(]/)[0].trim();

  const place =
    (await fromWikipedia(`${name} ${cleanArea} New York`, name)) ??
    (await fromWikipedia(`${name} New York City`, name)) ??
    (await fromCommons(`${name} ${cleanArea} New York`, name)) ??
    (await fromCommons(`${name} New York`, name));
  if (place) return place;

  if (!cleanArea) return null;
  const areaPhoto =
    (await fromWikipedia(`${cleanArea} Manhattan New York City neighborhood`, cleanArea)) ??
    (await fromWikipedia(`${cleanArea} New York City`, cleanArea));
  return areaPhoto ? { ...areaPhoto, kind: "area" } : null;
}

/** A photo of a dish or drink (e.g. "lomo saltado", "everything bagel"). Dishes are well covered on Wikipedia. */
export async function findDishPhoto(dish: string): Promise<PlacePhoto | null> {
  const name = dish.trim();
  if (!name) return null;
  const found =
    (await fromWikipedia(name, name)) ??
    (await fromWikipedia(`${name} food`, name)) ??
    (await fromCommons(`${name} food`, name)) ??
    (await fromCommons(name, name));
  if (found) return found;
  // "spicy cumin lamb noodles" -> try the last two words ("lamb noodles"), then the last ("noodles").
  const parts = words(name);
  for (const shorter of [parts.slice(-2).join(" "), parts.slice(-1).join(" ")]) {
    if (!shorter || shorter === name.toLowerCase()) continue;
    const photo = (await fromWikipedia(shorter, shorter)) ?? (await fromCommons(`${shorter} food`, shorter));
    if (photo) return photo;
  }
  return null;
}
