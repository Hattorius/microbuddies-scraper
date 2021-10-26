
export function chunk (arr, len) { // By https://stackoverflow.com/users/970409/furf
    var chunks = [],
        i = 0,
        n = arr.length;
    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }
    return chunks;
}
