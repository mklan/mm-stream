import "dotenv/config";
import path from "path";
import ip from "ip";

const parsePort = (portStr: string | undefined): number => {
  const parsed = parseInt(portStr || "3000", 10);
  return isNaN(parsed) || parsed < 1 || parsed > 65535 ? 3000 : parsed;
};

const port: number = parsePort(process.env.MM_PORT);
const baseUrl: string = process.env.MM_HOST || `http://${ip.address()}:${port}`;
const rootFolder: string = path.resolve(process.env.MM_FOLDER || "./media");

const getFullPath = (inputPath: string = ""): string => {
  // Remove leading slashes to treat all paths as relative to rootFolder
  const sanitizedInput = inputPath.replace(/^\/+/, "");
  const normalizedInput = path.normalize(sanitizedInput);
  return path.resolve(rootFolder, normalizedInput);
};

const isRootFolder = (inputPath: string = ""): boolean =>
  path.normalize(inputPath) === ".";

const insideRoot = (inputPath: string): boolean => {
  const resolvedPath = path.resolve(inputPath);
  const resolvedRoot = path.resolve(rootFolder);
  return (
    resolvedPath.startsWith(resolvedRoot + path.sep) ||
    resolvedPath === resolvedRoot
  );
};

export { port, baseUrl, rootFolder, getFullPath, insideRoot, isRootFolder };
