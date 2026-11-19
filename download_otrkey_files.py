import csv
import gzip
import json
import os
import re
import random
import time
import requests
from collections import Counter
from concurrent.futures import ThreadPoolExecutor


FILENAME_REGEX = re.compile(
    r"""^(?P<title>.+?)
    (?:_S(?P<season>\d{2})E(?P<episode>\d{2}))?
    _(?P<date>\d{2}\.\d{2}\.\d{2})
    _(?P<time>\d{2}-\d{2})
    _(?P<channel>[a-z0-9+.]+?)
    _(?P<duration>\d+)
    _TVOON_DE(?P<suffix>(?:\.[A-Za-z0-9]+)*)
    \.(?P<container>otrkey|otr2)$""",
    re.VERBOSE | re.IGNORECASE,
)

QUALITIES = {"hd": "HD", "hq": "HQ", "lq": "LQ"}
AUDIO = {"ac3", "mp3"}
VIDEO = {"avi", "mp4"}


def parse_otrkey_filename(filename: str):
    """Parse old (.otrkey) and new (.otr2) OTR file names.

    Suffix examples: .mpg.HQ.avi.otrkey, .mpg.mp4.otrkey, .mpg.ac3.otrkey,
    .HQ.otr2, .mpg.HD.otr2, .mpg.AddOn.otr2
    """
    match = FILENAME_REGEX.match(filename)
    if not match:
        return None

    info = match.groupdict()
    tokens = [t.lower() for t in info.pop("suffix").split(".") if t]

    info["title"] = info["title"].replace("_", " ").strip()
    info["container"] = info["container"].lower()

    hour, minute = info["time"].split("-")
    info["time"] = f"{hour}:{minute}"

    year, month, day = info["date"].split(".")
    info["date"] = f"20{year}-{month}-{day}"
    info["sortKey"] = (
        f"{info['title']}|"
        f"{100 - int(year)}-{12 - int(month)}-{31 - int(day)}|"
        f"{info['time']}|{info['channel']}|{info['duration']}"
    )

    # Determine format: audio > AddOn > quality > video container > SD avi
    audio = next((t for t in tokens if t in AUDIO), None)
    quality = next((QUALITIES[t] for t in tokens if t in QUALITIES), None)
    video = next((t for t in tokens if t in VIDEO), None)
    info["format"] = audio or ("AddOn" if "addon" in tokens else None) or quality or video or "avi"

    return info


with open("mirrors.json", "r") as f:
    MIRRORS = json.load(f)

HEADERS = {"User-Agent": "otrkey_files"}

OTRKEY_REGEX = re.compile(r"([A-Za-z0-9_.+-]+\.(?:otrkey|otr2))")


def extract_otrkeys(text):
    return list(set(OTRKEY_REGEX.findall(text)))


def fetch_list_text(url, proxy):
    if proxy == "PROXY1":
        # free tier is limited to 1000 requests/month
        # this ensures to stay below that with 99% confidence.
        if random.random() < 0.3188:
            payload = {"api_key": os.getenv("API_KEY"), "url": url}
            response = requests.get(
                "https://api.scraperapi.com/",
                headers=HEADERS,
                timeout=15,
                params=payload,
            )
        else:
            raise ValueError("Execution was skipped to stay below limit for free tier.")
    else:
        response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()
    return extract_otrkeys(response.text)


def fetch_files_for_mirror(mirror, fallback_entries):
    try:
        files = fetch_list_text(mirror["list_url"], mirror["proxy"])
        files = list(sorted(set(files)))
        if files:
            print(
                f"[OK] {mirror['name']}: {len(files)} files found from {mirror['list_url']}"
            )
            return [{"mirror_name": mirror["name"], "file_name": f} for f in files]
        else:
            raise ValueError("No files found from server response")
    except Exception as e:
        print(f"[FALLBACK] Using cached entries for {mirror['name']}: {e}")
        cached = fallback_entries.get(mirror["name"], [])
        return [{"mirror_name": mirror["name"], "file_name": f} for f in cached]


# ---------------------------------------------------------------- cutlists
# cutlists.csv.gz holds the metadata of every known cutlist. Each run appends
# the cutlists uploaded since the newest id in the file (a gzip file may consist
# of several appended parts; gzip.open reads them as one).
#
# Requests per run: the start page lists the 10 newest uploads with all details,
# so with <= 10 new cutlists that single request is enough. Otherwise the
# global upload stream (search for "." sorted by upload date, 20 per page) is
# paged until the last known id: 1 request per 20 new cutlists. The search stops
# at 1000 results; if more are new (long outage), the rest is fetched per
# broadcast year of the files on the mirrors.

CUTLIST_CSV = "cutlists.csv.gz"
CUTLIST_API = "http://cutlist.at/api"
CUTLIST_FIELDS = [
    "row_index", "id", "name", "rating", "ratingcount", "author", "ratingbyauthor",
    "actualcontent", "usercomment", "cuts", "filename", "filename_original", "autoname",
    "withframes", "withtime", "duration", "errors", "othererrordescription", "downloadcount",
]
ERROR_KEYS = ["start", "end", "video", "audio", "other", "epg"]  # order of the "errors" bits
SEARCH_MAX_PAGES = 50  # the search refuses page 50 and beyond (HTTP 416)


class CutlistApi:
    requests = 0

    @classmethod
    def call(cls, path, body=None):
        url = f"{CUTLIST_API}/{path}"
        for attempt in range(4):
            try:
                if body is None:
                    r = requests.get(url, headers=HEADERS, timeout=60)
                else:
                    r = requests.post(url, json=body, headers=HEADERS, timeout=60)
                cls.requests += 1
                if r.status_code == 416:  # "more than 1000 results"
                    return {}
                r.raise_for_status()
                return r.json()
            except requests.RequestException:
                if attempt == 3:
                    raise
                time.sleep(5 * 2 ** attempt)

    @classmethod
    def newest_since(cls, query, last_id):
        """Cutlists whose name contains `query` and id > last_id, newest first.
        Returns (items, complete); complete is False when the 1000-result limit was hit."""
        items = []
        for page in range(SEARCH_MAX_PAGES):
            if page:
                time.sleep(0.5)
            d = cls.call("search-by", {
                "conds": [{"query": query, "field": "name"}], "isOrConnection": False,
                "sortBy": "date", "isAsc": False, "page": page,
            })
            if "items" not in d:
                return items, False
            new = [i for i in d["items"] if i["id"] > last_id]
            items += new
            if len(new) < len(d["items"]) or not d.get("hasMore"):
                return items, True
        return items, False


def newest_by_broadcast_year(last_id, years):
    """Fallback for > 1000 new cutlists: one search per broadcast year ("_26."),
    split into months / 10-day parts / days only where a part is still too big."""
    todo, found = [f"_{y}." for y in sorted(years)], {}
    while todo:
        q = todo.pop(0)
        items, complete = CutlistApi.newest_since(q, last_id)
        found.update((i["id"], i) for i in items)
        if complete:
            continue
        if len(q) == 4:                       # "_26."     -> "_26.01." .. "_26.12."
            todo += [f"{q}{m:02d}." for m in range(1, 13)]
        elif len(q) == 7:                     # "_26.10."  -> "_26.10.0" .. "_26.10.3"
            todo += [q + d for d in "0123"]
        elif len(q) == 8:                     # "_26.10.1" -> "_26.10.10" .. "_26.10.19"
            todo += [q + d for d in "0123456789"]
        else:
            print(f"[CUTLISTS] still more than 1000 new cutlists for {q}, some are missing")
    return list(found.values())


def duration_seconds(text):
    try:
        h, m, s = (float(x) for x in text.split(":"))
        return round(h * 3600 + m * 60 + s, 2)
    except (AttributeError, ValueError):
        return ""


def cutlist_row(item):
    """API item -> row in the format of cutlists.csv.gz (the getxml.php columns)."""
    rating = item.get("rating") or {}
    errors = item.get("errors") or {}
    ratings = int(rating.get("ratings") or 0)
    suggested = item.get("suggestedName") or ""
    return {
        "row_index": "", "id": item["id"], "name": f"{item.get('otrkey') or ''}.cutlist",
        "rating": rating.get("avg", "") if ratings else "", "ratingcount": ratings,
        "author": item.get("author") or "", "ratingbyauthor": rating.get("author", ""),
        "actualcontent": "", "usercomment": item.get("comment") or "",
        "cuts": item.get("cutCount", ""), "filename": suggested, "filename_original": suggested,
        "autoname": "", "withframes": "", "withtime": "",
        "duration": duration_seconds(item.get("duration")),
        "errors": "".join("1" if errors.get(k) else "0" for k in ERROR_KEYS),
        "othererrordescription": errors.get("otherDesc") or "",
        "downloadcount": item.get("registeredDownloads") or 0,
    }


def update_cutlists(otrkey_entries):
    """Append every cutlist uploaded since the newest one in CUTLIST_CSV."""
    known, per_name = set(), Counter()
    try:
        with gzip.open(CUTLIST_CSV, "rt", encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                known.add(int(row["id"]))
                per_name[row["name"]] += 1
    except FileNotFoundError:
        print(f"[CUTLISTS] {CUTLIST_CSV} not found, skipping the cutlist update")
        return
    last_id = max(known, default=0)
    t0 = time.time()

    # 1) the start page: newest id, and all details of the 10 newest uploads
    try:
        top = CutlistApi.call("get-landing-page-data").get("topCutlists") or []
    except Exception as e:
        print(f"[CUTLISTS] start page failed ({e}), using the search only")
        top = []
    top_ids = {i["id"] for i in top}
    newest = max(top_ids, default=None)
    if newest is not None and newest <= last_id:
        print(f"[CUTLISTS] no new cutlists (newest id {newest})")
        return

    # 2) the new cutlists with all details
    if top_ids and set(range(last_id + 1, newest + 1)) <= top_ids:
        items = [i for i in top if i["id"] > last_id]        # all new ones are on the start page
    else:
        items, complete = CutlistApi.newest_since(".", last_id)
        if not complete:
            print(f"[CUTLISTS] more than 1000 new cutlists, fetching the rest per broadcast year")
            years = set()
            for files in otrkey_entries.values():
                for name in files:
                    info = parse_otrkey_filename(name)
                    if info:
                        years.add(info["date"][2:4])
            items += newest_by_broadcast_year(last_id, years)

    rows = []
    for item in sorted({i["id"]: i for i in items}.values(), key=lambda i: i["id"]):
        if item["id"] in known:
            continue
        row = cutlist_row(item)
        row["row_index"] = per_name[row["name"]]
        per_name[row["name"]] += 1
        rows.append(row)
    if rows:
        with gzip.open(CUTLIST_CSV, "at", encoding="utf-8", newline="") as f:
            csv.DictWriter(f, fieldnames=CUTLIST_FIELDS).writerows(rows)
    print(f"[CUTLISTS] {len(rows)} new cutlists (ids {last_id + 1}..{max([last_id] + [r['id'] for r in rows])}) "
          f"with {CutlistApi.requests} requests in {time.time() - t0:.1f} s")


def load_existing_entries(mode="otrkey"):
    fallback = {}
    error_flags = ['MissingBeginning', 'MissingEnding', 'MissingVideo', 'MissingAudio', 'OtherError', 'EPGError']
    try:
        if mode == "otrkey":
            with open("otrkey_files.csv", "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    fallback.setdefault(row["mirror_name"], []).append(row["file_name"])
        elif mode == "cutlist":
            with gzip.open(CUTLIST_CSV, "rt", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    key  = row["name"].split("_TVOON_")[0]
                    row['errors'] = [error_flags[i] for i, v in enumerate(row['errors']) if v == '1']
                    fallback.setdefault(key, []).append(row)
    except FileNotFoundError:
        print("No existing CSV found. Will not use fallback.")
    return fallback


def main():
    fallback_entries = load_existing_entries("otrkey")
    print("Update cutlists...")
    try:
        update_cutlists(fallback_entries)
    except Exception as e:  # cutlist.at down: keep the known cutlists, update the files anyway
        print(f"[CUTLISTS] update failed: {e}")
    print("Gather OTR mirror list...")
    cutlist_entries = load_existing_entries("cutlist")
    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [
            executor.submit(fetch_files_for_mirror, m, fallback_entries)
            for m in MIRRORS
        ]
        for future in futures:
            results.extend(future.result())

    for row in results:
        key  = row["file_name"].split("_TVOON_")[0]
        row['n_cutlists'] = 0
        row['all_errors'] = []
        if key in cutlist_entries:
            for entry in cutlist_entries[key]:
                row['all_errors'].extend(entry['errors'])
            row['n_cutlists'] = len(cutlist_entries[key])
        row['all_errors'] = '/'.join(sorted(set(row['all_errors'])))

    with open("otrkey_files.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["mirror_name", "file_name", "n_cutlists", "all_errors"])
        writer.writeheader()
        writer.writerows(results)

    print(f"Done. {len(results)} entries saved to 'otrkey_files.csv'.")


if __name__ == "__main__":
    main()
