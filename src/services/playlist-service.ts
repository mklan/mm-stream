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

/**
 * Writes tracks to a PLS playlist file
 */
async function writePlaylist(
  name: string,
  tracks: PlaylistTrack[]
): Promise<void> {
  // Sanitize the playlist name to prevent path traversal
  const sanitizedName = path.basename(name, ".pls");
  const playlistPath = path.join(playlistFolder, `${sanitizedName}.pls`);

  // Ensure playlist folder exists
  await fsp.mkdir(playlistFolder, { recursive: true });

  // Build PLS content
  const lines = ["[playlist]"];

  tracks.forEach((track, index) => {
    const trackNum = index + 1;
    lines.push(`File${trackNum}=${track.file}`);
    if (track.title) {
      lines.push(`Title${trackNum}=${track.title}`);
    }
    if (track.length) {
      lines.push(`Length${trackNum}=${track.length}`);
    }
  });

  lines.push(`NumberOfEntries=${tracks.length}`);
  lines.push("Version=2");
  lines.push(""); // Empty line at the end

  // Write to file
  await fsp.writeFile(playlistPath, lines.join("\n"), "utf-8");
}

/**
 * Adds tracks to an existing playlist or creates a new one
 */
export async function addTracksToPlaylist(
  name: string,
  newTracks: PlaylistTrack[]
): Promise<PlaylistTrack[]> {
  let existingTracks: PlaylistTrack[] = [];

  try {
    existingTracks = await getPlaylist(name);
  } catch (error) {
    // Playlist doesn't exist yet, that's okay
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  // Combine existing and new tracks
  const allTracks = [...existingTracks, ...newTracks];

  await writePlaylist(name, allTracks);

  return allTracks;
}

/**
 * Removes a track from a playlist by index
 */
export async function removeTrackFromPlaylist(
  name: string,
  trackIndex: number
): Promise<PlaylistTrack[]> {
  const tracks = await getPlaylist(name);

  if (trackIndex < 0 || trackIndex >= tracks.length) {
    throw new Error(
      `Track index ${trackIndex} is out of range (0-${tracks.length - 1})`
    );
  }

  // Remove the track at the specified index
  tracks.splice(trackIndex, 1);

  await writePlaylist(name, tracks);

  return tracks;
}

/**
 * Creates a new empty playlist
 */
export async function createPlaylist(name: string): Promise<void> {
  // Sanitize the playlist name to prevent path traversal
  const sanitizedName = path.basename(name, ".pls");
  const playlistPath = path.join(playlistFolder, `${sanitizedName}.pls`);

  // Check if playlist already exists
  try {
    await fsp.access(playlistPath);
    throw new Error(`Playlist "${sanitizedName}" already exists`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  // Create empty playlist
  await writePlaylist(name, []);
}

/**
 * Renames a playlist file
 */
export async function renamePlaylist(
  oldName: string,
  newName: string
): Promise<void> {
  // Sanitize both names to prevent path traversal
  const sanitizedOldName = path.basename(oldName, ".pls");
  const sanitizedNewName = path.basename(newName, ".pls");

  const oldPath = path.join(playlistFolder, `${sanitizedOldName}.pls`);
  const newPath = path.join(playlistFolder, `${sanitizedNewName}.pls`);

  // Check if source playlist exists
  try {
    await fsp.access(oldPath);
  } catch (error) {
    throw new Error(`Playlist "${sanitizedOldName}" not found`);
  }

  // Check if target name already exists
  try {
    await fsp.access(newPath);
    throw new Error(`Playlist "${sanitizedNewName}" already exists`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  // Rename the file
  await fsp.rename(oldPath, newPath);
}

/**
 * Deletes a playlist file
 */
export async function deletePlaylist(name: string): Promise<void> {
  // Sanitize the playlist name to prevent path traversal
  const sanitizedName = path.basename(name, ".pls");
  const playlistPath = path.join(playlistFolder, `${sanitizedName}.pls`);

  await fsp.unlink(playlistPath);
}
