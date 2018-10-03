const async = require('async');
const util = require('util');
const fs = require('fs');

const stat = util.promisify(fs.stat);
const readdir = util.promisify(fs.readdir);
const map = util.promisify(async.map);

// TODO move to env
const rootFolder = "/home/matthias/nfs/Multimedia/Musik";

async function getContent(path) {
    const files = await readdir(path, { withFileTypes: true });

    const getDetails = async (file) => {
        const isFile = file.isFile();
        const currPath = path + '/' + file.name;
        
        const { size } = await stat(currPath);
        const sanitizedPath = encodeURIComponent(currPath.replace(rootFolder + '/', ''));

        return { 
            size, 
            isFile, 
            name: file.name, 
            path: sanitizedPath,
            enter: `http://localhost:3000/${ isFile ? 'stream' : 'list' }?path=${sanitizedPath}`
            //children 
        };
    };

    return map(files, getDetails)
};

module.exports = getContent;