const async = require("async");
const util = require("util");
const fs = require("fs");
const NodeCache = require("node-cache");
const _path = require("path");

const stat = util.promisify(fs.stat);
const readdir = util.promisify(fs.readdir);
const map = util.promisify(async.map);

const rootFolder = process.env.MM_FOLDER;

const contentCache = new NodeCache();

const audioExtensions = [".mp3", ".flac", ".ogg"];
const isDir = file => !file.isFile();
const isDirOrAudio = file => isDir(file) || isAudioFile(file);

const hasExtension = arr => file => {
  return arr.includes(_path.extname(file.name));
};
const isAudioFile = hasExtension(audioExtensions);

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
  console.log("get content for", path);
  const cachedContent = contentCache.get(path);
  if (cachedContent) {
    console.log("using cached");
    return cachedContent;
  }

  console.log("read from disk");
  const files = await readdir(path, { withFileTypes: true });
  const content = await map(
    files.filter(isDirOrAudio),
    constructContentObject(path, host)
  );
  contentCache.set(path, content);
  return content;
}

module.exports = getContent;
