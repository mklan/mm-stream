const path = require('path');

const rootFolder = process.env.MM_FOLDER;

const hasRootPath = rootPath => path => path.startsWith(rootPath);
const insideRootFolder = hasRootPath(rootFolder);


const validateRootPath = (req, res, next) => {
        const filePath = path.normalize(rootFolder + '/' + (req.query.path || ''));

        if(insideRootFolder(filePath)) {
            req.query.fullPath = filePath;
            next()
        } else {
            res.send('path is not inside the specified folder!');
        }
}

module.exports = validateRootPath;
