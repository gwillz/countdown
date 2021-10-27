
import sys, os, time

wordlist = '/usr/share/dict/words'

def main(letters, min_length = 3, limit = 10):
    print('looking for:', letters)

    letters = [i for i in letters]
    found = []

    with open(wordlist, 'r') as file:
        count = 0
        start = time.process_time_ns()

        # Loop through _ALL_ the words.
        while word := file.readline():
            word = word.strip()

            # Some stats.
            count += 1
            rate = count / (time.process_time_ns() - start) * 1000 * 1000 * 1000
            print(f"\r{count} {rate:.2f}/second (avg)", end='', file=sys.stderr)

            # Too short or too long.
            if len(word) < min_length: continue
            if len(word) > len(letters): continue

            stash = letters.copy()

            # We're removing letters from the word from our rando string.
            # If any aren't in there, then is word isn't a match.
            # Buuut if we get to the end and the length == word then we've got one!
            length = 0
            for letter in word:
                try:
                    stash.remove(letter)
                    length += 1
                except ValueError:
                    break

            if length != len(word): continue

            found.append(word)

        # More status.
        took = (time.process_time_ns() - start) / 1000 / 1000 / 1000

        print();
        print("Done! Found", len(found), file=sys.stderr)
        print(f"Completed in {took:.2f} seconds", file=sys.stderr)

    # Sort alphabetically.
    found.sort(key=lambda item: len(item))

    # Print top 10.
    limit *= -1
    for word in found[limit:]:
        print(word)


if __name__ == '__main__':
    letters = sys.argv[1]
    main(letters)
