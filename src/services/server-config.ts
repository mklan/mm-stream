import "dotenv/config";
import path from "path";
import ip from "ip";

const port: number = parseInt(process.env.MM_PORT || "3000", 10);
const host: string = process.env.MM_HOST || ip.address() + ":" + port;
const rootFolder: string = process.env.MM_FOLDER || "./media";

const getFullPath = (inputPath: string = ""): string =>
  path.normalize(path.join(rootFolder, inputPath));

const isRootFolder = (inputPath: string = ""): boolean =>
  path.normalize(inputPath) === ".";

const insideRoot = (inputPath: string): boolean =>
  inputPath.startsWith(rootFolder);

export { port, host, rootFolder, getFullPath, insideRoot, isRootFolder };
