
(function(cb) {
    window.addEventListener('load', cb);
})(async function() {
    const MIN_LENGTH = 3;
    const TARGET = 'https://raw.githubusercontent.com/streetsidesoftware/cspell-dicts/main/dictionaries/en_GB/src/wordsEnGb.txt';

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


    async function search(letters) {
        output.innerText = 'Searching...';

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

            found.push(word);
            render();
        }

        function render() {
            found.sort((a, b) => b.length - a.length);
            output.innerText = found.join("\n");
        }

        if (!found.length) {
            output.innerText = 'No results.';
        }
    }
});
