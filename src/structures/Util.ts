import { AkairoClient, ClientUtil } from 'discord-akairo';

const PROTOCOL_AND_DOMAIN_RE = /^(?:\w+:)?\/\/(\S+)$/;
const LOCALHOST_DOMAIN_RE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const NON_LOCALHOST_DOMAIN_RE = /^[^\s\.]+\.\S{2,}$/;

export class Util extends ClientUtil {
    constructor(client: AkairoClient) {
        super(client);
    }

    base64(text: string, mode = 'encode') {
        if (mode === 'encode') return Buffer.from(text).toString('base64');
        if (mode === 'decode') return Buffer.from(text, 'base64').toString('utf8') || null;
        throw new TypeError(`${mode} is not a supported base64 mode.`);
    }

    chunkify<T>(a: T[], chunk: number) {
        return Array.from(Array(Math.ceil(a.length / chunk)), (_, i) =>
            a.slice(i * chunk, i * chunk + chunk)
        );
    }

    formatMilliseconds(ms: number) {
        let x = Math.floor(ms / 1000);
        const s = x % 60;

        x = Math.floor(x / 60);
        const m = x % 60;

        x = Math.floor(x / 60);
        const h = x % 24;

        const d = Math.floor(x / 24);

        const seconds = `${'0'.repeat(2 - s.toString().length)}${s}`;
        const minutes = `${'0'.repeat(2 - m.toString().length)}${m}`;
        const hours = `${'0'.repeat(2 - h.toString().length)}${h}`;
        const days = `${'0'.repeat(Math.max(0, 2 - d.toString().length))}${d}`;

        return `${days === '00' ? '' : `${days}:`}${hours}:${minutes}:${seconds}`;
    }

    /**
     * https://github.com/rigoneri/indefinite-article.js
     * @author: Rodrigo Neri (rigoneri)
     */
    indefiniteArticle(phrase: string) {
        // Getting the first word
        const match = /\w+/.exec(phrase);
        let word = 'an';
        if (match) word = match[0];
        else return word;

        const l_word = word.toLowerCase();
        // Specific start of words that should be preceeded by 'an'
        const alt_cases = ['honest', 'hour', 'hono'];
        for (const i in alt_cases) {
            if (l_word.indexOf(alt_cases[i]) === 0) return 'an';
        }

        // Single letter word which should be preceeded by 'an'
        if (l_word.length === 1) {
            if ('aedhilmnorsx'.indexOf(l_word) >= 0) return 'an';
            else return 'a';
        }

        // Capital words which should likely be preceeded by 'an'
        if (
            word.match(
                /(?!FJO|[HLMNS]Y.|RY[EO]|SQU|(F[LR]?|[HL]|MN?|N|RH?|S[CHKLMNPTVW]?|X(YL)?)[AEIOU])[FHLMNRSX][A-Z]/
            )
        ) {
            return 'an';
        }

        // Special cases where a word that begins with a vowel should be preceeded by 'a'
        const regexes = [/^e[uw]/, /^onc?e\b/, /^uni([^nmd]|mo)/, /^u[bcfhjkqrst][aeiou]/];
        for (const i in regexes) {
            if (l_word.match(regexes[i])) return 'a';
        }

        // Special capital words (UK, UN)
        if (word.match(/^U[NK][AIEO]/)) {
            return 'a';
        } else if (word === word.toUpperCase()) {
            if ('aedhilmnorsx'.indexOf(l_word[0]) >= 0) return 'an';
            else return 'a';
        }

        // Basic method of words that begin with a vowel being preceeded by 'an'
        if ('aeiou'.indexOf(l_word[0]) >= 0) return 'an';

        // Instances where y follwed by specific letters is preceeded by 'an'
        if (l_word.match(/^y(b[lor]|cl[ea]|fere|gg|p[ios]|rou|tt)/)) return 'an';

        return 'a';
    }

    capitalize(text: string) {
        return text.replace(/([^\W_]+[^\s-]*) */g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    /**
     * Inspired by https://github.com/MattIPv4/DNS-over-Discord/blob/v2/src/utils/table.js
     * @author Matt (IPv4) Cowley (MattIPv4)
     */
    chunkStr(str: string, size: number) {
        const strArr = str.split('');
        let ret = [];
        // TODO: Prefer to wrap at ', ' if possible
        while (strArr.length) ret.push(strArr.splice(0, size).join(''));
        return ret;
    }

    escapeMarkdown(text: string) {
        let unescaped = text.replace(/\\(\*|_|`|~|\\)/g, '$1');
        let escaped = unescaped.replace(/(\*|_|`|~|\\)/g, '\\$1');
        return escaped;
    }

    escapeRegExp(text: string) {
        return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
    }

    /**
     * Shorten a `string[]` to conform to 1024-character limit
     * @param {string[]}} tags
     */
    gshorten(tags: Array<string>, split = ' ') {
        let res = '';
        for (const tag of tags) {
            res += res.length + tag.length + split.length <= 1020 ? tag + split : '';
        }
        return res + (tags.join(split).length > 1024 ? ' ...' : '');
    }

    hasCommon<T>(texts: T[], keywords: T[]) {
        return [...new Set(texts)].some(x => new Set(keywords).has(x));
    }

    isUrl(s: string) {
        if (typeof s !== 'string') return false;
        const match = s.match(PROTOCOL_AND_DOMAIN_RE);
        if (!match) return false;
        const everythingAfterProtocol = match[1];
        if (!everythingAfterProtocol) return false;
        if (
            LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol) ||
            NON_LOCALHOST_DOMAIN_RE.test(everythingAfterProtocol)
        )
            return true;
        return false;
    }

    pad(text: string, width: number, char = '0') {
        return String(text).length >= width
            ? String(text)
            : new Array(width - String(text).length + 1).join(char) + String(text);
    }

    /**
     * Inspired by https://github.com/MattIPv4/DNS-over-Discord/blob/v2/src/utils/table.js
     * @author Matt (IPv4) Cowley (MattIPv4)
     */
    presentTable(tableRows: Array<Array<string>>) {
        const columns = tableRows.reduce((count, row) => Math.max(count, row.length), 0);
        const columnPadding = (idx: number) => (idx === 0 || idx === columns - 1 ? 1 : 2);

        // Define a max width for columns
        // Each column can be at maximum 2/3 of the total Discord width, minus space for dividers
        const discordWidth = 56;
        const totalWidth = discordWidth - (columns - 1);
        const columnWidth = Math.floor(totalWidth * (2 / 3));

        // Get the max width for each column
        const columnWidths = tableRows.reduce((widths, row) => {
            // Update the max width for each column
            let usedWidth = 0;
            row.forEach((val, idx) => {
                // The max width is capped at the columnWidth,
                //  and also the remaining width
                widths[idx] = Math.min(
                    totalWidth - usedWidth,
                    columnWidth,
                    Math.max(widths[idx], val.length + columnPadding(idx))
                );

                // Track the used width for subsequent columns
                usedWidth += widths[idx];
            });
            return widths;
        }, Array(columns).fill(0));

        // Define the chars
        const borderVertical = '|';
        const borderHorizontal = '-';
        const borderJoin = '+';

        // Get the width & suffix for any column
        const colData = (idx: number) => ({
            width: columnWidths[idx] - columnPadding(idx),
            suffix: idx === columns - 1 ? '' : ` ${borderVertical} `,
        });

        // Build the rows
        return tableRows
            .map((row, rowIdx) => {
                // Wrap each column into a set of sub-rows
                const strCols = row.map((col, colIdx) => {
                    // Determine the width, with padding,
                    //  and if not the last col, add border + padding for this and next
                    const { width, suffix } = colData(colIdx);

                    // Wrap the col to the width and add the suffix to each wrapped row
                    return this.chunkStr(col, width).map(
                        colRow => colRow.padEnd(width, ' ') + suffix
                    );
                });

                // Get the max sub-rows
                const maxRows = strCols.reduce((count, col) => Math.max(count, col.length), 0);

                // Combine the sub-rows
                const strRow = strCols
                    .reduce((rows, col, colIdx) => {
                        // Extend the number of rows we have in this column if needed
                        if (col.length < rows.length) {
                            const { width, suffix } = colData(colIdx);
                            col.push(
                                ...Array(rows.length - col.length).fill(' '.repeat(width) + suffix)
                            );
                        }

                        // Add our column rows to the final rows
                        col.forEach((row: string, subRowIdx: number) => (rows[subRowIdx] += row));
                        return rows;
                    }, Array(maxRows).fill(''))
                    .join('\n');

                // If header row, add divider
                const divider =
                    rowIdx === 0
                        ? '\n' +
                          columnWidths.map(size => borderHorizontal.repeat(size)).join(borderJoin)
                        : '';

                // Return all the wrapped rows that form this row
                return strRow + divider;
            })
            .join('\n');
    }

    random(array: Array<any>) {
        return array[Math.floor(Math.random() * array.length)];
    }

    shorten(text: string, split = ' ', maxLen = 2000) {
        if (text.length <= maxLen) return text;
        return text.substring(0, text.lastIndexOf(split, maxLen) + 1) + '`...`';
    }

    toTitleCase(text: string) {
        return text
            .toLowerCase()
            .replace(/guild/g, 'Server')
            .replace(/_/g, ' ')
            .replace(/\b[a-z]/g, t => t.toUpperCase());
    }
}
