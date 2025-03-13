const http = require('http');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { parse } = require('querystring');

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/upload') {
        handleFileUpload(req, res);
    } else if (req.method === 'GET' && req.url === '/files') {
        listUploadedFiles(req, res);
    } else {
        serveStaticFiles(req, res);
    }
});

// Function to serve static files
function serveStaticFiles(req, res) {
    let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`, 'utf8');
            }
        } else {
            const mimeType = mime.lookup(filePath) || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': mimeType });
            res.end(content, 'utf8');
        }
    });
}

// Function to handle file upload
function handleFileUpload(req, res) {
    const boundary = req.headers['content-type'].split('boundary=')[1];
    let rawData = Buffer.alloc(0);

    req.on('data', (chunk) => {
        rawData = Buffer.concat([rawData, chunk]);
    });

    req.on('end', () => {
        const rawText = rawData.toString();
        const fileDataMatch = rawText.match(/filename="(.+)"\r\nContent-Type: (.+)\r\n\r\n([\s\S]+?)\r\n--/);

        if (!fileDataMatch) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid file upload.');
            return;
        }

        const filename = `${Date.now()}_${fileDataMatch[1]}`;
        const fileType = fileDataMatch[2];
        const fileContent = Buffer.from(fileDataMatch[3], 'binary');

        // Allowed file types
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        if (!allowedTypes.includes(fileType)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid file type. Only JPG, PNG, and PDF are allowed.');
            return;
        }

        fs.writeFile(path.join(uploadDir, filename), fileContent, (err) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error while saving the file.');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end(`File uploaded successfully: ${filename}`);
            }
        });
    });
}

// Function to list uploaded files
function listUploadedFiles(req, res) {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to read directory' }));
        } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(files));
        }
    });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
