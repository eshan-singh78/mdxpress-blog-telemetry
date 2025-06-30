const http = require('http');
const fs = require('fs');
const path = require('path');
const marked = require('marked');

const logger = (req, res, statusCode) => {
    const method = req.method;
    const url = req.url;
    const status = statusCode || res.statusCode;
    console.log(`[${new Date().toISOString()}] ${method} ${url} ${status}`);
};

const renderTemplate = (filePath, replacements, res, req) => {
    console.log(`Attempting to read template from: ${filePath}`);
    fs.readFile(filePath, 'utf8', (err, template) => {
        if (err) {
            console.error(`Error reading template file: ${err.message}`);
            res.writeHead(500);
            res.end('Template loading error');
            logger(req, res, 500);
            return;
        }

        let rendered = template;
        for (const key in replacements) {
            const value = replacements[key];
            rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
        logger(req, res, 200);
    });
};

const server = http.createServer((req, res) => {
    const url = req.url;

    if (url === '/') {
        const mdPath = path.join(__dirname, 'public', 'md', 'index.md');
        const templatePath = path.join(__dirname, 'public', 'views', 'home.html');

        fs.readFile(mdPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading homepage');
                logger(req, res, 500);
                return;
            }

            const title = (data.match(/^# (.+)/) || [])[1] || 'Homepage';
            const htmlContent = marked.parse(data);

            renderTemplate(templatePath, { title, content: htmlContent }, res, req);
        });

    } else if (url === '/blog') {
        const blogDir = path.join(__dirname, 'public', 'blogs');
        const templatePath = path.join(__dirname, 'public', 'views', 'blog.html');

        fs.readdir(blogDir, (err, files) => {
            if (err) {
                res.writeHead(500);
                res.end('Unable to read blog directory');
                logger(req, res, 500);
                return;
            }

            const blogList = files
                .filter(file => file.endsWith('.md'))
                .map(file => {
                    const slug = file.replace('.md', '');
                    return `<li><a href="/blog/${slug}">${slug.replace(/-/g, ' ')}</a></li>`;
                })
                .join('\n');

            const content = `<h1>My Blogs</h1><ul>${blogList}</ul>`;
            renderTemplate(templatePath, { title: 'My Blog', content }, res, req);
        });

    } else if (url.startsWith('/blog/')) {
        const slug = url.split('/blog/')[1];
        const filePath = path.join(__dirname, 'public', 'blogs', `${slug}.md`);
        const templatePath = path.join(__dirname, 'public', 'views', 'blog.html');

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Blog post not found');
                logger(req, res, 404);
                return;
            }

            const titleMatch = data.match(/^# (.+)/);
            const title = titleMatch ? titleMatch[1] : slug;
            const content = marked.parse(data);

            renderTemplate(templatePath, { title, content }, res, req);
        });

    } else if (url.startsWith('/styles/')) {
        const filePath = path.join(__dirname, 'public', url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('File not found');
                logger(req, res, 404);
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(data);
            logger(req, res);
        });

    } else {
        res.writeHead(404);
        res.end('Not Found');
        logger(req, res, 404);
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
