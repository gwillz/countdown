
(function(cb) {
    window.addEventListener('load', cb);
})(async function() {
    const MIN_LENGTH = 3;
    const MAX_RESULTS = 100;
    const TARGET = 'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/b13f8035d03d5491cd8fe618cab532e4ff58ffd2/dictionaries/en_GB-legacy/src/wordsEnGb.txt';

    let ready = false;

    const form = document.getElementById('-js-form');
    const input = document.getElementById('-js-input');
    const output = document.getElementById('-js-output');

    const params = new URLSearchParams(location.search);
    input.value = params.get('letters');

    // Input events.
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (ready) {
            search(input.value);
            history.replaceState(null, '', location.pathname + '?letters=' + encodeURIComponent(input.value));
        }
    });

    // Load up.
    const words = await load();

    input.focus();

    // Do the things.
    if (input.value) {
        search(input.value);
    }

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

            ready = true;
            return words;
        }
        catch (error) {
            output.innerText = error.message || error;
        }
    }

    async function search(query) {
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

            props.results = await getDictionary(props.word);
            ref.replaceWith(render(props));
        }

        const ref = h('li', {}, [
            h('span', { className: 'click', onclick: lookup }, [
                `${props.word} (${props.word.length})`,
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
