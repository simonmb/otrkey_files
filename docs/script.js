(async function () {
    const zipUrl = 'https://cdn.jsdelivr.net/gh/simonmb/otrkey_files/otrkey_files.zip';
    let files = []; // Make 'files' available globally inside IIFE

    function downloadZipWithProgress(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'arraybuffer';

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
                    resolve(xhr.response);
                } else {
                    reject(new Error('Failed to download ZIP'));
                }
            };

            xhr.onerror = function () {
                reject(new Error('Network error'));
            };

            xhr.send();
        });
    }

    const zipData = await downloadZipWithProgress(zipUrl);
    const zip = await JSZip.loadAsync(zipData);

    const csvFile = zip.file('otrkey_files.csv');
    if (!csvFile) {
        console.error("CSV file not found in ZIP");
        return;
    }

    const csvText = await csvFile.async('text');
    const mirrorList = await fetch('https://cdn.jsdelivr.net/gh/simonmb/otrkey_files/mirrors.json').then((r) => r.json());

    const parsedCsv = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    console.log('Parsed rows:', parsedCsv.data.length);

    files = parsedCsv.data
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

    // Populate mirror checkboxes
    const mirrorFilterEl = document.getElementById('mirrorFilter');
    Object.keys(mirrorMap).forEach((mirror) => {
        const li = document.createElement('li');
        li.innerHTML = `<label><input type="checkbox" value="${mirror}" class="form-check-input me-2" checked>${mirror}</label>`;
        mirrorFilterEl.appendChild(li);
    });

    // Check all format checkboxes by default
    document.querySelectorAll('#formatFilter input[type="checkbox"]').forEach(cb => cb.checked = true);

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

        if (!files || files.length === 0) {
            searchingEl.classList.add('d-none');
            noResultsEl.classList.remove('d-none');
            return;
        }

        const selectedFormats = Array.from(document.querySelectorAll('#formatFilter input:checked')).map(i => i.value.toLowerCase());
        const selectedMirrors = Array.from(document.querySelectorAll('#mirrorFilter input:checked')).map(i => i.value);

        const filtered = files.filter(({ parsed, file_name, mirror_name }) => {
            const matchesQuery =
                (parsed && normalize(parsed.title).includes(term)) ||
                normalize(file_name).includes(term);

            const matchesFormat =
                selectedFormats.length === 0 ||
                selectedFormats.includes(parsed.format.toLowerCase());

            const matchesMirror =
                selectedMirrors.length === 0 ||
                selectedMirrors.includes(mirror_name);

            return matchesQuery && matchesFormat && matchesMirror;
        });

        console.log('Filtered results:', filtered.length);
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
                format: p.format,
                parsed: p
            });
        }

        const formatOrder = ['mp3', 'ac3', 'mp4', 'avi', 'HQ', 'HD'];

        const sortedGroups = Array.from(groups.entries()).sort(([keyA], [keyB]) => {
            return keyA.localeCompare(keyB);
        });

        const fragment = document.createDocumentFragment();

        for (const [key, filesInGroup] of sortedGroups) {
            const { title, date, time, channel, duration, season, episode } = filesInGroup[0].parsed;

            // Build heading
            const headingDiv = document.createElement('div');

            const titleStrong = document.createElement('strong');
            titleStrong.textContent = title;
            headingDiv.appendChild(titleStrong);

            if (season && episode) {
                const episodeSpan = document.createElement('span');
                episodeSpan.className = 'text-muted';
                episodeSpan.textContent = ` (S${season}E${episode})`;
                headingDiv.appendChild(episodeSpan);
            }

            const metaText = document.createTextNode(` — ${date} ${time} — ${channel} — ${duration} min`);
            headingDiv.appendChild(metaText);

            // Build links
            const linksDiv = document.createElement('div');
            linksDiv.className = 'mt-1';

            const links = filesInGroup
                .map(({ mirror_name, file_name, format }) => {
                    const urlTemplate = mirrorMap[mirror_name];
                    if (!urlTemplate) return null;
                    const url = urlTemplate.replace('{query}', encodeURIComponent(file_name));
                    return { format, url };
                })
                .filter(Boolean)
                .sort((a, b) => {
                    const idxA = formatOrder.indexOf(a.format);
                    const idxB = formatOrder.indexOf(b.format);
                    return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                });

            for (const { format, url } of links) {
                const a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.className = 'me-2';
                a.textContent = format;
                linksDiv.appendChild(a);
            }

            // Build list item
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.appendChild(headingDiv);
            li.appendChild(linksDiv);

            fragment.appendChild(li);
        }

        resultsEl.appendChild(fragment);

    }

    function clearSearch() {
        resultsEl.innerHTML = '';
        noResultsEl.classList.remove('d-none');
        searchingEl.classList.add('d-none');
    }

    function parseOtrkeyFilename(filename) {
        const pattern = /^(?<title>.+?)(?:_S(?<season>\d{2})E(?<episode>\d{2}))?_(?<date>\d{2}\.\d{2}\.\d{2})_(?<time>\d{2}-\d{2})_(?<channel>[a-z0-9]+)_(?<duration>\d+)_TVOON_DE\.mpg(?:\.(?<quality>HQ|HD))?(?:\.fra)?(?:\.auto)?(?:\.cut)?\.(?:(?<video_format>avi|mp4)|(?<audio_format>ac3|mp3))\.otrkey$/i;

        const match = filename.match(pattern);
        if (!match || !match.groups) {
            console.log('No match', filename);
            return null;
        }

        const info = { ...match.groups };

        if (info.date) {
            const [year, month, day] = info.date.split('.');
            info.date = `20${year}-${month}-${day}`;
        }

        if (info.time) {
            const [hour, minute] = info.time.split('-');
            info.time = `${hour}:${minute}`;
        }

        if (info.title) {
            info.title = info.title.replace(/_/g, ' ').trim();
        }

        info.format = (info.audio_format || info.quality || info.video_format || 'avi');

        // Cleanup
        delete info.quality;
        delete info.video_format;
        delete info.audio_format;

        return info;
    }



})();
