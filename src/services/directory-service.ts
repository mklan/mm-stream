import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import NodeCache from "node-cache";

import { getFullPath, host, isRootFolder, rootFolder } from "./server-config";
import { ContentEntry, ContentMetadata } from "../types/content";

const CACHE_TTL_SECONDS = 300; // 5 minutes
const contentCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".ogg"] as const;

const isDirectory = (file: fs.Dirent): boolean => file.isDirectory();

const hasExtension =
  (extensions: readonly string[]) =>
  (file: fs.Dirent): boolean =>
    extensions.includes(path.extname(file.name).toLowerCase());

const isAudioFile = hasExtension(AUDIO_EXTENSIONS);

const isValidEntry = (file: fs.Dirent): boolean =>
  isDirectory(file) || isAudioFile(file);

/**
 * Converts an absolute file path to a URL-safe relative path.
 * Returns empty string (root) for any paths outside the root folder.
 * This is a defensive measure - paths should already be validated by middleware.
 */
const sanitizePath = (filePath: string): string => {
  const relativePath = path.relative(rootFolder, filePath);
  // Ensure the path doesn't start with '..' to prevent path traversal
  if (relativePath.startsWith("..")) {
    return "";
  }
  return encodeURIComponent(relativePath);
};

/**
 * Gets the parent directory path relative to root folder.
 * Returns empty string (root) if parent would be outside the root folder.
 */
const getParentPath = (currentPath: string): string => {
  const fullPath = getFullPath(currentPath);
  const parentPath = path.dirname(fullPath);
  const relativePath = path.relative(rootFolder, parentPath);
  // Return empty string if we would go outside the root
  if (relativePath.startsWith("..")) {
    return "";
  }
  return encodeURIComponent(relativePath);
};

const buildEntryUrl = (isFile: boolean, sanitizedPath: string): string => {
  const endpoint = isFile ? "stream" : "list";
  return `${host}/${endpoint}?path=${sanitizedPath}`;
};

const createContentEntry = async (
  currentPath: string,
  file: fs.Dirent
): Promise<ContentEntry> => {
  const isFile = file.isFile();
  const filePath = path.join(getFullPath(currentPath), file.name);

  const stats = await fsp.stat(filePath);
  const sanitizedPath = sanitizePath(filePath);

  const metadata: ContentMetadata = {};

  return {
    size: stats.size,
    isFile,
    name: file.name,
    metadata,
    path: sanitizedPath,
    enter: buildEntryUrl(isFile, sanitizedPath),
  };
};

const createParentLink = (currentPath: string): ContentEntry[] => {
  if (isRootFolder(currentPath) || currentPath === "/") {
    return [];
  }

  const parentPath = getParentPath(currentPath);

  return [
    {
      isFile: false,
      name: "..",
      path: parentPath,
      enter: `${host}/list?path=${parentPath}`,
    },
  ];
};

async function getContent(currentPath: string = ""): Promise<ContentEntry[]> {
  const normalizedPath = currentPath || "";
  
  const cachedContent = contentCache.get<ContentEntry[]>(normalizedPath);
  if (cachedContent) {
    return cachedContent;
  }

  const fullPath = getFullPath(normalizedPath);
  const files = await fsp.readdir(fullPath, { withFileTypes: true });
  const validFiles = files.filter(isValidEntry);

  const contentPromises = validFiles.map((file) =>
    createContentEntry(normalizedPath, file)
  );
  const content = await Promise.all(contentPromises);

  const contentWithParentLink = [...createParentLink(normalizedPath), ...content];

  contentCache.set(normalizedPath, contentWithParentLink);
  return contentWithParentLink;
}

export default getContent;
export { contentCache, AUDIO_EXTENSIONS };
