(async function () {
    const branch = 'main';
    const repoOwner = 'simonmb';
    const repoName = 'otrkey_files';
    const baseRaw = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/`;

    function downloadWithProgress(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'text';

            const progressWrapper = document.getElementById('progressWrapper');
            const progressBar = document.getElementById('progressBar');
            progressWrapper.style.display = 'block';

            xhr.onprogress = function (event) {
                if (event.lengthComputable) {
                    const percent = Math.floor((event.loaded / event.total) * 100);
                    progressBar.style.width = percent + '%';
                    progressBar.textContent = percent + '%';
                }
            };

            xhr.onload = function () {
                if (xhr.status === 200) {
                    progressBar.style.width = '100%';
                    progressBar.textContent = '100%';
                    setTimeout(() => {
                        progressWrapper.style.display = 'none';
                    }, 500);
                    resolve(xhr.responseText);
                } else {
                    reject(new Error('Failed to download CSV'));
                }
            };

            xhr.onerror = function () {
                reject(new Error('Network error'));
            };

            xhr.send();
        });
    }

    const csvText = await downloadWithProgress(baseRaw + 'otrkey_files.csv');
    const mirrorList = await fetch(baseRaw + 'mirrors.json').then((r) => r.json());

    const parsedCsv = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    const files = parsedCsv.data
        .filter((row) => row.mirror_name && row.file_name)
        .map((row) => ({
            ...row,
            parsed: parseOtrkeyFilename(row.file_name),
        }));

    const mirrorMap = {};
    mirrorList.forEach((m) => {
        if (m.name && m.search_url && !mirrorMap[m.name]) {
            mirrorMap[m.name] = m.search_url;
        }
    });

    const inputEl = document.getElementById('search');
    const resultsEl = document.getElementById('results');
    const noResultsEl = document.getElementById('no-results');
    const searchingEl = document.getElementById('searching');

    inputEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    inputEl.focus();

    function normalize(str) {
        return str
            .toLowerCase()
            .replace(/_/g, '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }
    async function performSearch() {
        const term = normalize(inputEl.value.trim());
        if (!term) {
            clearSearch();
            return;
        }

        searchingEl.classList.remove('d-none');
        resultsEl.innerHTML = '';
        noResultsEl.classList.add('d-none');

        await new Promise((r) => setTimeout(r, 0));

        const filtered = files.filter(({ parsed, file_name }) =>
            (parsed && normalize(parsed.title).includes(term)) ||
            normalize(file_name).includes(term)
        );

        searchingEl.classList.add('d-none');

        if (filtered.length === 0) {
            noResultsEl.classList.remove('d-none');
            return;
        }

        const groups = new Map();

        for (const row of filtered) {
            const p = row.parsed;
            if (!p) continue;
            const key = `${p.title}|${p.date}|${p.time}|${p.channel}|${p.duration}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push({
                mirror_name: row.mirror_name,
                file_name: row.file_name,
                container: p.container,
                quality: p.quality,
                parsed: p
            });
        }

        const formatOrder = ['mp4', 'avi', 'HQ', 'HD'];

        for (const [key, filesInGroup] of groups.entries()) {
            const { title, date, time, channel, duration, season, episode } = filesInGroup[0].parsed;

            // Construct label with SxxEyy if present
            let titleLine = `<strong>${title}</strong>`;
            if (season && episode) {
                titleLine += ` <span class="text-muted">(S${season}E${episode})</span>`;
            }

            const heading = `${titleLine} — ${date} ${time} — ${channel} — ${duration} min`;

            const links = filesInGroup
                .map(({ mirror_name, file_name, container, quality }) => {
                    const label = quality?.toUpperCase() || container.toLowerCase();
                    const urlTemplate = mirrorMap[mirror_name];
                    if (!urlTemplate) return null;
                    const url = urlTemplate.replace('{query}', encodeURIComponent(file_name));
                    return { label, url };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    const idxA = formatOrder.indexOf(a.label);
                    const idxB = formatOrder.indexOf(b.label);
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                })
                .map(({ label, url }) => `<a href="${url}" target="_blank" class="me-2">${label}</a>`)
                .join(' ');

            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.innerHTML = `
      <div>${heading}</div>
      <div class="mt-1">${links}</div>
    `;
            resultsEl.appendChild(li);
        }
    }


    function clearSearch() {
        resultsEl.innerHTML = '';
        noResultsEl.classList.remove('d-none');
        searchingEl.classList.add('d-none');
    }

    function parseOtrkeyFilename(filename) {
        const pattern = /^(?<title>.+?)(?:_S(?<season>\d{2})E(?<episode>\d{2}))?_(?<date>\d{2}\.\d{2}\.\d{2})_(?<time>\d{2}-\d{2})_(?<channel>[a-z0-9]+)_(?<duration>\d+)_TVOON_DE\.mpg(?:\.(?<quality>HQ|HD))?\.(?<container>avi|mp4)\.otrkey$/i;

        const match = filename.match(pattern);
        if (!match || !match.groups) return null;

        const info = { ...match.groups };

        // Format date to YYYY-MM-DD
        if (info.date) {
            const [year, month, day] = info.date.split('.');
            info.date = `20${year}-${month}-${day}`;
        }

        // Format time to HH:MM
        if (info.time) {
            const [hour, minute] = info.time.split('-');
            info.time = `${hour}:${minute}`;
        }

        if (info.title) {
            info.title = info.title.replace(/_/g, ' ').trim();
        }

        return info;
    }

})();
