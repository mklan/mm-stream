const async = require("async");
const util = require("util");
const fs = require("fs");
const NodeCache = require("node-cache");
const _path = require("path");

const { getFullPath, host, isRootFolder } = require("./server-config");

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

const sanitizePath = path =>
  encodeURIComponent(path.replace(rootFolder + "/", ""));

const constructContentObject = path => async file => {
  const isFile = file.isFile();
  const filePath = _path.join(getFullPath(path), file.name);

  const { size } = await stat(filePath);
  const sanitizedPath = sanitizePath(filePath);

  return {
    size,
    isFile,
    name: file.name,
    path: sanitizedPath,
    enter: `http://${host}/${isFile ? "stream" : "list"}?path=${sanitizedPath}`
  };
};

const createParentLink = path => {
  if (isRootFolder(path)) return [];
  const sanitizedPath = sanitizePath(path) + "/..";

  return [
    {
      isFile: false,
      name: "..",
      path: sanitizedPath,
      enter: `http://${host}/list?path=${sanitizedPath}`
    }
  ];
};

async function getContent(path) {
  console.log("get content for", path);
  const cachedContent = contentCache.get(path);
  if (cachedContent) {
    console.log("using cached");
    return cachedContent;
  }

  console.log("read from disk");
  const files = await readdir(getFullPath(path), { withFileTypes: true });
  const content = await map(
    files.filter(isDirOrAudio),
    constructContentObject(path)
  );

  const contentWithDirUp = [...createParentLink(path), ...content];

  contentCache.set(path, contentWithDirUp);
  return contentWithDirUp;
}

module.exports = getContent;
