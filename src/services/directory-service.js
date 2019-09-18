const async = require("async");
const util = require("util");
const fs = require("fs");

const stat = util.promisify(fs.stat);
const readdir = util.promisify(fs.readdir);
const map = util.promisify(async.map);

const rootFolder = process.env.MM_FOLDER;

const audioTypes = ["mp3", "flac", "ogg"];
const isDirOrAudioFile = file =>
  !file.isFile() || audioTypes.indexOf(file.name.split(".").slice(-1)[0]) > -1;

const constructContentObject = (path, host) => async file => {
  const isFile = file.isFile();
  const currPath = path + "/" + file.name;

  const { size } = await stat(currPath);
  const sanitizedPath = encodeURIComponent(
    currPath.replace(rootFolder + "/", "")
  );

  return {
    size,
    isFile,
    name: file.name,
    path: sanitizedPath,
    enter: `http://${host}/${isFile ? "stream" : "list"}?path=${sanitizedPath}`
    //children
  };
};

async function getContent(path, host) {
  const files = await readdir(path, { withFileTypes: true });
  return map(
    files.filter(isDirOrAudioFile),
    constructContentObject(path, host)
  );
}

module.exports = getContent;
