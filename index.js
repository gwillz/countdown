
(function(cb) {
    window.addEventListener('load', cb);
})(function() {
    const MIN_LENGTH = 3;
    const MAX_RESULTS = 100;
    const TARGET = 'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/b13f8035d03d5491cd8fe618cab532e4ff58ffd2/dictionaries/en_GB-legacy/src/wordsEnGb.txt';

    const form = document.getElementById('-js-form');
    const input = document.getElementById('-js-input');
    const output = document.getElementById('-js-output');

    (async () => {
        const params = new URLSearchParams(location.search);
        input.value = params.get('letters');

        // Load up.
        const words = await load();

        input.disabled = false;
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
            history.replaceState(null, '', location.pathname + '?letters=' + encodeURIComponent(input.value));
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

        for (let word of words) {
            if (word.length < MIN_LENGTH) continue;
            if (word.length > letters.length) continue;

            const stash = letters.split('');
            let length = 0;

            for (let letter of word.split('')) {
                if (!stash.includes(letter)) continue;

                stash.splice(stash.indexOf(letter), 1);
                length++;
            }

            if (length != word.length) continue;
            if (required && !word.includes(required)) continue;

            found.push(word);
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
            output.insertAdjacentElement('beforeend', list);
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

        let ref = h('li', {}, [
            h('span', {}, [
                h('span', { className: 'click', onclick: lookup }, [
                    `${props.word}`,
                ]),
                h('span', {}, [
                    props.loading ? ' - ' : `(${props.word.length})`,
                ]),
                props.loading ? h('span', { className: 'loading' }, ['loading...']) : null,
            ]),
            h('ol', {}, (props.results ?? []).map(result => (
                h('li', {}, [
                    h('em', {}, [result.partOfSpeech]),
                    h('ol', {}, result.definitions.map(def => (
                        h('li', {}, [
                            def.definition,
                        ])
                    ))),
                ])
            ))),
        ]);

        return ref;
    }

    async function getDictionary(word) {
        const res = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + word, {
            mode: 'cors',
            cache: "force-cache",
        });

        if (!res.ok) {
            return {
                partOfSpeech: res.status == 404 ? 'No definitions found.' : res.statusText,
                definitions: [],
            };
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
                if (!child) continue;

                if (child instanceof Node) {
                    element.insertAdjacentElement('beforeend', child);
                }
                else {
                    element.insertAdjacentText('beforeend', child);
                }
            }

            return element;
        }

        h.replace = function replace(oldElement, newElement) {
            oldElement.replaceWith(newElement);
            return newElement;
        };

        return h;
    }());
});
