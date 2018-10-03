const express = require('express');
const ms = require('mediaserver');

const validateRootPath = require('./middlewares/validateRootPath');
const getContent = require('./services/directory-service');

const app = express();
const port = 3000;

app.use('/stream', validateRootPath);
app.use('/list', validateRootPath);  

app.get('/stream', (req, res) => {
    ms.pipe(req, res, req.query.fullPath)
});

app.get('/list', async (req, res) => {
    try {
        const entries = await getContent(req.query.fullPath);
        res.send([{ up: `http://localhost:3000/list?path=${entries[0].path.replace(encodeURIComponent(entries[0].name), '')}/..` }, ...entries]);
    } catch (e) {
        console.log(e);
    }
});

app.listen(port, () => console.log(`listening on port ${port}!`));