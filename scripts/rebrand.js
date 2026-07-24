const fs = require('fs');
const path = require('path');

const directoryToSearch = path.join(__dirname, '..');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            if (f !== 'node_modules' && f !== '.git' && f !== 'images' && f !== 'categoriess' && f !== 'data') {
                walkDir(dirPath, callback);
            }
        } else {
            callback(path.join(dir, f));
        }
    });
}

const textFiles = ['.html', '.js', '.css', '.md', '.json'];

walkDir(directoryToSearch, function(filePath) {
    const ext = path.extname(filePath);
    if (!textFiles.includes(ext)) return;
    if (filePath.includes('package-lock.json')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // CSS Color replacements
    if (ext === '.css') {
        content = content.replace(/rgba\(255,\s*255,\s*255,/g, '[[TEMP_BLACK]]');
        content = content.replace(/rgba\(10,\s*10,\s*10,/g, 'rgba(255, 255, 255,');
        content = content.replace(/\[\[TEMP_BLACK\]\]/g, 'rgba(0, 0, 0,');
        content = content.replace(/#fff/g, '#111'); // change white to dark text
        content = content.replace(/#fff;/gi, '#111;');
        // The above is dangerous for general text, but mostly safe for styles if we need dark text. 
        // Actually I won't replace #fff globally, as it might break white things we want to keep.
        // Reverting #fff replace. Let's just do rgba.
        content = original.replace(/rgba\(255,\s*255,\s*255,/g, '[[TEMP_BLACK]]')
                          .replace(/rgba\(10,\s*10,\s*10,/g, 'rgba(255, 255, 255,')
                          .replace(/\[\[TEMP_BLACK\]\]/g, 'rgba(0, 0, 0,');
    }

    // Text Replacements
    content = content.replace(/KRIPA/g, 'KRIPA');
    content = content.replace(/Kripa/g, 'Kripa');
    content = content.replace(/KRIPA/g, 'KRIPA');
    content = content.replace(/Kripa/g, 'Kripa');
    content = content.replace(/kripa/g, 'kripa');

    content = content.replace(/Pickles/g, 'Pickles');
    content = content.replace(/pickles/g, 'pickles');
    content = content.replace(/Pickle/g, 'Pickle');
    content = content.replace(/pickle/g, 'pickle');

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated:', filePath);
    }
});
console.log('Rebranding complete.');
