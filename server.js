
const express = require('express');
const app = express();
const path = require('path');
const port = 3111;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});

app.get('/index.js', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.js'));
});

app.get('/style.css', (req, res) => {
    res.sendFile(path.join(__dirname + '/style.css'));
});

app.get('/site.webmanifest', (req, res) => {
    res.sendFile(path.join(__dirname + '/site.webmanifest'));
});

app.get('/apple-touch-icon.png', (req, res) => {
    res.sendFile(path.join(__dirname + '/apple-touch-icon.png'));
});

app.get('/favicon-32x32.png', (req, res) => {
    res.sendFile(path.join(__dirname + '/favicon-32x32.png'));
});

app.get('/favicon-16x16.png', (req, res) => {
    res.sendFile(path.join(__dirname + '/favicon-16x16.png'));
});

app.get('/safari-pinned-tab.svg', (req, res) => {
    res.sendFile(path.join(__dirname + '/safari-pinned-tab.svg'));
});


app.use('/sounds', express.static('sounds'));
app.use('/images', express.static('images'));
app.use('/js', express.static('js'));

app.listen(port);

