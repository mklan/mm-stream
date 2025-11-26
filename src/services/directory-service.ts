import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import * as mm from "music-metadata";
import NodeCache from "node-cache";

import { getFullPath, host, isRootFolder } from "./server-config";

const rootFolder = process.env.MM_FOLDER || "./media";

const contentCache = new NodeCache();

const audioExtensions = [".mp3", ".flac", ".ogg"];

interface ContentEntry {
  size?: number;
  isFile: boolean;
  name: string;
  metadata?: {
    title?: string;
    artist?: string;
  };
  path: string;
  enter: string;
}

const isDir = (file: fs.Dirent): boolean => !file.isFile();

const hasExtension =
  (arr: string[]) =>
  (file: fs.Dirent): boolean => {
    return arr.includes(path.extname(file.name));
  };

const isAudioFile = hasExtension(audioExtensions);
const isDirOrAudio = (file: fs.Dirent): boolean =>
  isDir(file) || isAudioFile(file);

const sanitizePath = (filePath: string): string =>
  encodeURIComponent(filePath.replace(rootFolder + "/", ""));

const constructContentObject =
  (currentPath: string) =>
  async (file: fs.Dirent): Promise<ContentEntry> => {
    const isFile = file.isFile();
    const filePath = path.join(getFullPath(currentPath), file.name);

    const stats = await fsp.stat(filePath);
    const sanitizedPath = sanitizePath(filePath);

    let metadata: { title?: string; artist?: string } = {};
    if (isFile) {
      const parsedMeta = await mm.parseFile(filePath);
      metadata = {
        title: parsedMeta.common.title,
        artist: parsedMeta.common.artist,
      };
    }

    return {
      size: stats.size,
      isFile,
      name: file.name,
      metadata,
      path: sanitizedPath,
      enter: `http://${host}/${isFile ? "stream" : "list"}?path=${sanitizedPath}`,
    };
  };

const createParentLink = (currentPath: string): ContentEntry[] => {
  if (isRootFolder(currentPath) || currentPath === "/") return [];
  const sanitizedPath = sanitizePath(currentPath) + "/..";

  return [
    {
      isFile: false,
      name: "..",
      path: sanitizedPath,
      enter: `http://${host}/list?path=${sanitizedPath}`,
    },
  ];
};

async function getContent(currentPath: string = ""): Promise<ContentEntry[]> {
  const normalizedPath = currentPath || "";
  console.log("get content for", normalizedPath);
  const cachedContent = contentCache.get<ContentEntry[]>(normalizedPath);
  if (cachedContent) {
    console.log("using cached");
    return cachedContent;
  }

  console.log("read from disk");
  const files = await fsp.readdir(getFullPath(normalizedPath), {
    withFileTypes: true,
  });
  const filteredFiles = files.filter(isDirOrAudio);

  const content = await Promise.all(
    filteredFiles.map(constructContentObject(normalizedPath))
  );

  const contentWithDirUp = [...createParentLink(normalizedPath), ...content];

  contentCache.set(normalizedPath, contentWithDirUp);
  return contentWithDirUp;
}

export default getContent;
