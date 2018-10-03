const path = require('path');

// TODO move to env
const rootFolder = "/home/matthias/nfs/Multimedia/Musik";

const hasRootPath = rootPath => path => path.startsWith(rootPath);
const insideRootFolder = hasRootPath(rootFolder);


const validateRootPath = (req, res, next) => {
        const filePath = path.normalize(rootFolder + '/' + req.query.path);

        if(insideRootFolder(filePath)) {
            req.query.fullPath = filePath;
            next()
        } else {
            res.send('path is not inside the specified folder!');
        }
}

module.exports = validateRootPath;