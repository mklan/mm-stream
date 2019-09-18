require("dotenv").config();
const _path = require("path");
const ip = require("ip");

const port = process.env.MM_PORT || 3000;
const host = process.env.MM_HOST || ip.address() + ":" + port;
const rootFolder = process.env.MM_FOLDER;

const getFullPath = (path = "") => _path.normalize(rootFolder + "/" + path);

const insideRoot = path => path.startsWith(rootFolder);

module.exports = {
  port,
  host,
  rootFolder,
  getFullPath,
  insideRoot
};
