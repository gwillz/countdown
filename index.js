
(function(cb) {
    window.addEventListener('load', cb);
})(function() {
    const params = new URLSearchParams(location.search);

    const MAX_RESULTS = params.get('max') || 100;

    const form = document.getElementById('-js-form');
    const input = document.getElementById('-js-input');
    const extra = document.getElementById('-js-extra');
    const output = document.getElementById('-js-output');

    const worker = new Worker('search.js');
    worker.onerror = error => {
        output.innerText = `Error: ${error.message}`;
        console.error(error);
    }

    (async () => {
        input.value = params.get('letters');
        input.checked = params.get('extra') == 'yes';

        // Load up.
        await load();

        input.disabled = false;
        extra.disabled = false;
        form.disabled = false;
        input.focus();

        // Do the things.
        if (input.value) {
            search(input.value);
        }

        // Input events.
        form.addEventListener('submit', async event => {
            event.preventDefault();

            search(input.value);

            const params = new URLSearchParams();
            params.set('letters', input.value);

            if (extra.checked) {
                params.set('extra', extra.value);
            }

            if (MAX_RESULTS != 100) {
                params.set('max', MAX_RESULTS);
            }

            history.replaceState(null, '', location.pathname + '?' + params.toString());
        });
    })();

    async function load() {
        return new Promise(resolve => {
            output.innerText = 'loading...';

            worker.postMessage({ type: 'load' });
            worker.onmessage = (event) => {
                const { type, data } = event.data;

                if (type === 'ready') {
                    console.log(`Loaded words: ${data}`);
                    output.innerText = 'ready.';
                    resolve();
                }
                else if (type === 'error') {
                    output.innerText = `Error: ${data}`;
                    resolve();
                }
                else {
                    output.innerText = `Unknown message: ${type}`;
                    resolve();
                }
            }
        });
    }

    async function search(query) {
        output.innerText = 'Searching...';

        input.disabled = true;
        extra.disabled = true;
        form.disabled = true;

        query = query.trim();
        query = query.toLowerCase();

        const match = query.match(/([^!]*)\s*!?([^\s]+)?/);
        const [, letters, required] = match;

        console.time('search');
        const found = await getSearch(query, required, extra.checked);
        console.timeEnd('search');

        if (!found.length) {
            output.innerText = 'No results.';
        }
        else {
            found.splice(MAX_RESULTS);

            const list = h('ol', {}, found.map(word => (
                render({ word })
            )));

            output.innerHTML = '';
            h.insert(output, h('div', {}, [
                h('span', {}, ['Results for: ']),
                h('strong', {}, [`${letters}`]),
                h('span', {}, [` (${query.replace(/\s/g, '').length})`]),
                required && h('div', {}, [
                    h('span', {}, ['Must include: ']),
                    h('strong', {}, [required]),
                ]),
            ]));
            h.insert(output, list);
        }

        input.disabled = false;
        extra.disabled = false;
        form.disabled = false;
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
                h('span', {}, [` (${props.word.replace(/\s/g, '').length})`]),
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

    async function getSearch(query, required, extra) {
        return new Promise(resolve => {
            worker.postMessage({
                type: 'search',
                data: { query, required, extra },
            });

            worker.onmessage = (event) => {
                const { type, data } = event.data;

                if (type === 'results') {
                    resolve(data);
                }
                else if (type === 'stats') {
                    console.log(data);
                    output.innerText = data;
                }
                else {
                    output.innerText = `Unknown message: ${type}`;
                    resolve();
                }
            }
        });
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
