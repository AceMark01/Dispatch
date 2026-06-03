const fs = require('fs');
const txt = fs.readFileSync('C:/Users/ACER/.gemini/antigravity/brain/8f1f052d-ca18-455c-b56f-d5cb9400b324/.system_generated/logs/overview.txt', 'utf8');

let fileLines = [];
let capture = false;
let currentLine = 1;

// The output from view_file has format "123: const x = 1;" but it's stringified in JSON.
// We can just un-stringify the JSON lines.
const lines = txt.split('\n');
for (let line of lines) {
    try {
        const obj = JSON.parse(line);
        if (obj.tool_calls && obj.tool_calls[0] && obj.tool_calls[0].response) {
            const out = obj.tool_calls[0].response.output;
            if (out && out.includes('c:/Users/ACER/Downloads/zip_Acemark/t25_Acemark/src/store/dispatchStore.js')) {
                const parts = out.split('\n');
                for (let p of parts) {
                    const m = p.match(/^(\d+): (.*)$/);
                    if (m) {
                        const num = parseInt(m[1], 10);
                        fileLines[num] = m[2];
                    }
                }
            }
        }
    } catch(e) {}
}

fs.writeFileSync('recovered.js', fileLines.slice(1).join('\n'));
console.log('Recovered lines:', fileLines.length - 1);
