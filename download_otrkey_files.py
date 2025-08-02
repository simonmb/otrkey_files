import requests
import csv
import json
import re
from concurrent.futures import ThreadPoolExecutor

def parse_otrkey_filename(filename):
    pattern = re.compile(
        r"""^(?P<title>.+?)                                   # Title
        (?:_S(?P<season>\d{2})E(?P<episode>\d{2}))?           # Optional SxxExx
        _(?P<date>\d{2}\.\d{2}\.\d{2})                        # Date
        _(?P<time>\d{2}-\d{2})                                # Time
        _(?P<channel>[a-z0-9]+)                               # Channel
        _(?P<duration>\d+)                                    # Duration
        _TVOON_DE\.mpg                                        # Fixed marker
        (?:\.(?P<quality>HQ|HD))?                             # Optional quality
        \.(?P<container>avi|mp4)                              # Container
        \.otrkey$""",
        re.VERBOSE | re.IGNORECASE
    )

    match = pattern.match(filename)
    if not match:
        return None

    info = match.groupdict()
    
    # Reformat date to YYYY-MM-DD
    if info["date"]:
        day, month, year = info["date"].split(".")
        info["date"] = f"20{year}-{month}-{day}"
    
    # Reformat time to HH:MM
    if info["time"]:
        hour, minute = info["time"].split("-")
        info["time"] = f"{hour}:{minute}"

    # Replace underscores with spaces in title
    info["title"] = info["title"].replace("_", " ").strip()

    return info

with open("mirrors.json", "r") as f:
    MIRRORS = json.load(f)

HEADERS = {
    "User-Agent": "otrkey_files"
}

OTRKEY_REGEX = re.compile(r'([A-Za-z0-9_.+-]+\.otrkey)')

def extract_otrkeys(text):
    return list(set(OTRKEY_REGEX.findall(text)))

def fetch_list_text(url):
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        return extract_otrkeys(response.text)
    except Exception as e:
        print(f"[ERROR] Fetching {url}: {e}")
        return []

def fetch_files_for_mirror(mirror):
    files = fetch_list_text(mirror["list_url"])
    files = list(sorted(set(files)))

    print(f"[OK] {mirror['name']}: {len(files)} files found from {mirror['list_url']}")
    return [{"mirror_name": mirror["name"], "file_name": f} for f in files]

def main():
    print("Gather OTR mirror list...")
    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(fetch_files_for_mirror, m) for m in MIRRORS]
        for future in futures:
            results.extend(future.result())

    with open("otrkey_files.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["mirror_name", "file_name"])
        writer.writeheader()
        writer.writerows(results)

    print(f"✅ Done. {len(results)} entries saved to 'otrkey_files.csv'.")

if __name__ == "__main__":
    main()
