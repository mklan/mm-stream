import fsp from "fs/promises";
import path from "path";
import { playlistFolder } from "./server-config";

export interface PlaylistTrack {
  file: string;
  title?: string;
  length?: string;
}

/**
 * Lists all .pls files in the playlist folder
 */
export async function getPlaylists(): Promise<string[]> {
  try {
    const files = await fsp.readdir(playlistFolder);
    return files
      .filter((file) => file.toLowerCase().endsWith(".pls"))
      .map((file) => path.basename(file, ".pls"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

/**
 * Parses a .pls playlist file and returns the tracks
 * PLS format example:
 * [playlist]
 * File1=/path/to/file.mp3
 * Title1=Song Title
 * Length1=123
 * NumberOfEntries=1
 */
export async function getPlaylist(name: string): Promise<PlaylistTrack[]> {
  // Sanitize the playlist name to prevent path traversal
  const sanitizedName = path.basename(name, ".pls");
  const playlistPath = path.join(playlistFolder, `${sanitizedName}.pls`);

  // Read the file
  const content = await fsp.readFile(playlistPath, "utf-8");
  const lines = content.split(/\r?\n/);

  const tracks: Map<number, PlaylistTrack> = new Map();

  // Parse the PLS file
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("[")) continue;

    const match = trimmedLine.match(/^(File|Title|Length)(\d+)=(.+)$/i);
    if (!match) continue;

    const [, key, indexStr, value] = match;
    const index = parseInt(indexStr, 10);

    if (!tracks.has(index)) {
      tracks.set(index, { file: "" });
    }

    const track = tracks.get(index)!;

    switch (key.toLowerCase()) {
      case "file":
        track.file = value;
        break;
      case "title":
        track.title = value;
        break;
      case "length":
        track.length = value;
        break;
    }
  }

  // Convert map to array and filter out empty entries, sorting by index
  return Array.from(tracks.entries())
    .filter(([, track]) => track.file)
    .sort(([a], [b]) => a - b)
    .map(([, track]) => track);
}
