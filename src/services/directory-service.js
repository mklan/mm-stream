const async = require('async');
const util = require('util');
const fs = require('fs');

const stat = util.promisify(fs.stat);
const readdir = util.promisify(fs.readdir);
const map = util.promisify(async.map);

const rootFolder = process.env.MM_FOLDER;
const host = process.env.MM_HOST || 'localhost';

const audioTypes = ['mp3', 'flac', 'ogg'];

async function getContent(path) {
    const files = await readdir(path, { withFileTypes: true });

    const isDirOrAudioFile = file => !file.isFile() || audioTypes.indexOf(file.name.split('.').slice(-1)[0]) > -1;

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
            enter: `http://${host}:3000/${ isFile ? 'stream' : 'list' }?path=${sanitizedPath}`
            //children 
        };
    };

    return map(files.filter(isDirOrAudioFile), getDetails);
};

module.exports = getContent;
