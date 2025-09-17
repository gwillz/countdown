
(function(cb) {
    window.addEventListener('load', cb);
})(function() {
    const MIN_LENGTH = 3;
    const MAX_RESULTS = 100;
    const TARGET = 'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/b13f8035d03d5491cd8fe618cab532e4ff58ffd2/dictionaries/en_GB-legacy/src/wordsEnGb.txt';

    const form = document.getElementById('-js-form');
    const input = document.getElementById('-js-input');
    const extra = document.getElementById('-js-extra');
    const output = document.getElementById('-js-output');

    (async () => {
        const params = new URLSearchParams(location.search);
        input.value = params.get('letters');
        input.checked = params.get('extra') == 'yes';

        // Load up.
        const words = await load();

        input.disabled = false;
        extra.disabled = false;
        form.disabled = false;
        input.focus();

        // Do the things.
        if (input.value) {
            // await ready.lock;
            search(words, input.value);
        }

        // Input events.
        form.addEventListener('submit', async event => {
            event.preventDefault();

            search(words, input.value);

            const params = new URLSearchParams();
            params.set('letters', input.value);

            if (extra.checked) {
                params.set('extra', extra.value);
            }

            history.replaceState(null, '', location.pathname + '?' + params.toString());
        });
    })();

    async function load() {
        try {
            output.innerText = 'loading...';

            const res = await fetch(TARGET, {
                mode: 'cors',
                cache: "force-cache",
            });

            if (!res.ok) {
                throw new Error(`Failed to load word list: ${res.status} ${res.statusText}`);
            }

            output.innerText = 'unpacking...';

            const words = (await res.text()).split("\n");

            output.innerText = 'ready.';

            return words;
        }
        catch (error) {
            output.innerText = error.message || error;
        }
    }

    function search(words, query) {
        output.innerText = 'Searching...';

        const match = query.trim().match(/([^!\s]*)\s*!?([^\s]+)?/);
        const [, letters, required] = match;

        const found = [];

        function *subSearch(query, required = '') {
            for (let word of words) {
                if (word.length < MIN_LENGTH) continue;
                if (word.length > query.length) continue;
                if (word === letters) continue;

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

        for (let word of subSearch(letters, required)) {
            found.push(word);
        }

        if (extra.checked) {
            for (let word of found.slice()) {
                if (word.length == letters.length) continue;
                if (letters.length - word.length < 3) continue;

                const remaining = letters.split('').filter(letter => !word.includes(letter));
                const query = remaining.join('');

                for (let extra of subSearch(query)) {
                    if (word === extra) continue;

                    const combo = [word, extra].sort().join(' ');
                    if (found.includes(combo)) continue;

                    found.push(combo);
                }
            }
        }

        if (!found.length) {
            output.innerText = 'No results.';
        }
        else {
            found.sort((a, b) => b.length - a.length);
            found.splice(MAX_RESULTS);

            const list = h('ol', {}, found.map(word => (
                render({ word })
            )));

            output.innerHTML = '';
            h.insert(output, h('div', {}, [
                h('span', {}, ['Results for: ']),
                h('strong', {}, [`${query} (${query.length})`]),
            ]));
            h.insert(output, list);
        }
    }

    function render(props) {
        async function lookup() {
            if (props.results) return;

            props.loading = true;
            ref = h.replace(ref, render(props));

            props.results = await getDictionary(props.word);
            props.loading = false;
            ref = h.replace(ref, render(props));
        }

        function swap() {
            const words = props.word.split(' ');
            const [first] = words.splice(0, 1);
            words.push(first);

            props.word = words.join(' ');
            ref = h.replace(ref, render(props));
        }

        let ref = h('li', {}, [
            h('span', {}, [
                h('span', { className: 'click', onclick: props.word.includes(' ') ? swap : lookup }, [
                    `${props.word}`,
                ]),
                h('span', {}, [` (${props.word.length})`]),
            ]),
            props.loading ? h('div', { className: 'loading' }, ['loading...']) : null,
            props.results && (
                props.results.length > 0 ? (
                    h('ol', {}, props.results.map(result => (
                        h('li', {}, [
                            h('em', {}, [result.partOfSpeech]),
                            h('ol', {}, result.definitions.map(def => (
                                h('li', {}, [
                                    def.definition,
                                ])
                            ))),
                        ])
                    )))
                ) : (
                    h('div', {}, 'No definitions found')
                )
            )
        ]);

        return ref;
    }

    async function getDictionary(word) {
        const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + word, {
            mode: 'cors',
            cache: "force-cache",
        });

        if (!res.ok) {
            return [];
        }

        const json = await res.json();
        const { meanings } = json[0];
        return meanings;
    }

    const h = (function() {
        function h(tag, attributes, children) {
            /** @type {HTMLElement} */
            const element = document.createElement(tag);

            for (let [key, value] of Object.entries(attributes)) {
                element[key] = value;
            }

            for (let child of children) {
                if (Array.isArray(child)) {
                    for (let subchild of child) {
                        h.insert(element, subchild);
                    }
                }
                else {
                    h.insert(element, child);
                }
            }

            return element;
        }

        h.insert = function insert(parent, node) {
            if (node instanceof Node) {
                parent.insertAdjacentElement('beforeend', node);
            }
            else if (typeof node === 'string') {
                parent.insertAdjacentText('beforeend', node);
            }
        };

        h.replace = function replace(oldElement, newElement) {
            oldElement.replaceWith(newElement);
            return newElement;
        };

        return h;
    }());
});
