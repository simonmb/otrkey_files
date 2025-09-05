import csv
import json
import os
import re
import random
import requests
from concurrent.futures import ThreadPoolExecutor


def parse_otrkey_filename(filename: str):
    pattern = re.compile(
        r"""^(?P<title>.+?)
        (?:_S(?P<season>\d{2})E(?P<episode>\d{2}))?
        _(?P<date>\d{2}\.\d{2}\.\d{2})
        _(?P<time>\d{2}-\d{2})
        _(?P<channel>[a-z0-9]+)
        _(?P<duration>\d+)
        _TVOON_DE\.mpg
        (?:\.(?P<quality>HQ|HD))?
        (?:\.fra)?
        (?:\.auto)?
        (?:\.cut)?
        \.(?:(?P<video_format>avi|mp4)|(?P<audio_format>ac3|mp3))
        \.otrkey$""",
        re.VERBOSE | re.IGNORECASE,
    )

    match = pattern.match(filename)
    if not match:
        return None

    info = match.groupdict()

    # Clean up title
    if info.get("title"):
        info["title"] = info["title"].replace("_", " ").strip()

    # Reformat time
    if info.get("time"):
        hour, minute = info["time"].split("-")
        info["time"] = f"{hour}:{minute}"

    # Reformat date and build sortKey
    if info.get("date"):
        year, month, day = info["date"].split(".")
        info["date"] = f"20{year}-{month}-{day}"
        info["sortKey"] = (
            f"{info['title']}|"
            f"{100 - int(year)}-{12 - int(month)}-{31 - int(day)}|"
            f"{info['time']}|{info['channel']}|{info['duration']}"
        )

    # Determine format
    info["format"] = info.get("audio_format") or info.get("quality") or info.get("video_format") or "avi"

    # Remove temporary fields
    info.pop("quality", None)
    info.pop("video_format", None)
    info.pop("audio_format", None)

    return info


with open("mirrors.json", "r") as f:
    MIRRORS = json.load(f)

HEADERS = {"User-Agent": "otrkey_files"}

OTRKEY_REGEX = re.compile(r"([A-Za-z0-9_.+-]+\.otrkey)")


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


def load_existing_entries(mode="otrkey"):
    fallback = {}
    try:
        if mode == "otrkey":
            with open("otrkey_files.csv", "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    fallback.setdefault(row["mirror_name"], []).append(row["file_name"])
        elif mode == "cutlist":
            with open("cutlists.csv", "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    key  = row["name"].split("_TVOON_")[0]
                    fallback.setdefault(key, []).append(row["name"])
    except FileNotFoundError:
        print("⚠️  No existing CSV found. Will not use fallback.")
    return fallback


def main():
    print("Gather OTR mirror list...")
    fallback_entries = load_existing_entries("otrkey")
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
        if key in cutlist_entries:
            row['n_cutlists'] = len(cutlist_entries[key])

    with open("otrkey_files.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["mirror_name", "file_name", "n_cutlists"])
        writer.writeheader()
        writer.writerows(results)

    print(f"✅ Done. {len(results)} entries saved to 'otrkey_files.csv'.")


if __name__ == "__main__":
    main()
