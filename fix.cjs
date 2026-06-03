const fs = require('fs');
let code = fs.readFileSync('src/store/dispatchStore.js', 'utf8');

const regex = /formatDateTime\(itemObj\.planned1[\s\S]*?itemObj\.status2 \|\| ''/m;
const match = regex.exec(code);
if (match) {
    console.log("Found match!");
    code = code.replace(regex, `null, // J
            formatDateTime(itemObj.actual1), // K
            null, // L
            null, // M
            null, // N
            formatDateTime(itemObj.actual2), // O
            null, // P
            null // Q`);
    fs.writeFileSync('src/store/dispatchStore.js', code);
} else {
    console.log("No match found.");
}
