
const MIN_LENGTH = 3;

const TARGET = 'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/b13f8035d03d5491cd8fe618cab532e4ff58ffd2/dictionaries/en_GB-legacy/src/wordsEnGb.txt';

const words = [];

const EVENTS = {
    async load() {
        try {
            const res = await fetch(TARGET, {
                mode: 'cors',
                cache: "force-cache",
            });

            if (!res.ok) {
                throw new Error(`Failed to load word list: ${res.status} ${res.statusText}`);
            }

            const importWords = (await res.text()).split("\n");

            for (let word of importWords) {
                word = word.trim();
                word = word.toLowerCase();
                if (word.length < MIN_LENGTH) continue;
                if (!/^[a-z]+$/.test(word)) continue;

                words.push(word);
            }

            words.sort();

            postMessage({
                type: 'ready',
                data: words.length,
            });
        }
        catch (error) {
            postMessage({
                type: 'error',
                data: error?.message || String(error),
            });
        }
    },

    search({query, required, extra}) {
        query = query.replace(/\s/g, '');
        required = required || '';

        const found = [];

        function *subSearch(query, required = '') {
            for (let word of words) {
                if (word.length < MIN_LENGTH) continue;
                if (word.length > query.length) continue;
                if (word === query) continue;

                const stash = query.split('');
                let length = 0;

                for (let letter of word.split('')) {
                    if (!stash.includes(letter)) continue;

                    stash.splice(stash.indexOf(letter), 1);
                    length++;
                }

                if (length != word.length) continue;
                if (required && !word.includes(required)) continue;

                yield word;
            }
        }

        for (let word of subSearch(query, required)) {
            found.push(word);
        }

        if (extra) {
            postMessage({
                type: 'stats',
                data: `Found words: ${found.length}, searching for extra words`,
            });

            for (let word of found.slice()) {
                if (word.length == query.length) continue;
                if (query.length - word.length < 3) continue;

                const remaining = query.split('').filter(letter => !word.includes(letter));
                const subQuery = remaining.join('');

                for (let extra of subSearch(subQuery)) {
                    if (word === extra) continue;

                    const combo = [word, extra].sort().join(' ');
                    if (found.includes(combo)) continue;

                    found.push(combo);
                }
            }
        }

        postMessage({
            type: 'stats',
            data: `Found words: ${found.length}`,
        });

        found.sort((a, b) => b.length - a.length || a.localeCompare(b));

        postMessage({
            type: 'results',
            data: found,
        });
    }
};

onmessage = (event => {
    if (typeof event !== 'object') {
        return;
    }

    const { type, data } = event.data;

    EVENTS[type]?.(data);
});
