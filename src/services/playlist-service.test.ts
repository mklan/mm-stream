import fsp from "fs/promises";
import path from "path";

// Store original environment
const originalEnv = { ...process.env };

describe("playlist-service", () => {
  const testPlaylistFolder = path.join(__dirname, "../../test-playlists");

  beforeEach(async () => {
    // Reset environment variables
    process.env = { ...originalEnv };

    // Set up test playlist folder
    process.env.MM_PLAYLIST_FOLDER = testPlaylistFolder;

    // Clear module cache to reset config between tests
    vi.resetModules();

    // Create test directory
    try {
      await fsp.mkdir(testPlaylistFolder, { recursive: true });
    } catch (error) {
      // Ignore if already exists
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fsp.readdir(testPlaylistFolder);
      await Promise.all(
        files.map((file) => fsp.unlink(path.join(testPlaylistFolder, file)))
      );
      await fsp.rmdir(testPlaylistFolder);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getPlaylists", () => {
    it("should return empty array when playlist folder does not exist", async () => {
      await fsp.rmdir(testPlaylistFolder);
      const { getPlaylists } = await import("./playlist-service");
      const playlists = await getPlaylists();
      expect(playlists).toEqual([]);
    });

    it("should return list of .pls files without extension", async () => {
      await fsp.writeFile(
        path.join(testPlaylistFolder, "playlist1.pls"),
        "[playlist]"
      );
      await fsp.writeFile(
        path.join(testPlaylistFolder, "playlist2.pls"),
        "[playlist]"
      );
      await fsp.writeFile(
        path.join(testPlaylistFolder, "other.txt"),
        "not a playlist"
      );

      const { getPlaylists } = await import("./playlist-service");
      const playlists = await getPlaylists();
      expect(playlists).toEqual(
        expect.arrayContaining(["playlist1", "playlist2"])
      );
      expect(playlists).toHaveLength(2);
    });

    it("should handle empty playlist folder", async () => {
      const { getPlaylists } = await import("./playlist-service");
      const playlists = await getPlaylists();
      expect(playlists).toEqual([]);
    });

    it("should be case-insensitive for .pls extension", async () => {
      await fsp.writeFile(
        path.join(testPlaylistFolder, "test.PLS"),
        "[playlist]"
      );
      await fsp.writeFile(
        path.join(testPlaylistFolder, "test2.Pls"),
        "[playlist]"
      );

      const { getPlaylists } = await import("./playlist-service");
      const playlists = await getPlaylists();
      expect(playlists).toHaveLength(2);
    });
  });

  describe("getPlaylist", () => {
    it("should parse a valid .pls file", async () => {
      const plsContent = `[playlist]
File1=/path/to/song1.mp3
Title1=First Song
Length1=180
File2=/path/to/song2.mp3
Title2=Second Song
Length2=240
NumberOfEntries=2`;

      await fsp.writeFile(
        path.join(testPlaylistFolder, "test.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      const tracks = await getPlaylist("test");
      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toEqual({
        file: "/path/to/song1.mp3",
        title: "First Song",
        length: "180",
      });
      expect(tracks[1]).toEqual({
        file: "/path/to/song2.mp3",
        title: "Second Song",
        length: "240",
      });
    });

    it("should handle playlist with only file entries", async () => {
      const plsContent = `[playlist]
File1=/path/to/song.mp3
NumberOfEntries=1`;

      await fsp.writeFile(
        path.join(testPlaylistFolder, "minimal.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      const tracks = await getPlaylist("minimal");
      expect(tracks).toHaveLength(1);
      expect(tracks[0]).toEqual({
        file: "/path/to/song.mp3",
      });
    });

    it("should sanitize playlist name to prevent path traversal", async () => {
      const plsContent = `[playlist]
File1=/song.mp3`;

      await fsp.writeFile(
        path.join(testPlaylistFolder, "safe.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      // Try to access with path traversal
      const tracks = await getPlaylist("../safe");
      expect(tracks).toHaveLength(1);
      expect(tracks[0].file).toBe("/song.mp3");
    });

    it("should handle playlist name with .pls extension", async () => {
      const plsContent = `[playlist]
File1=/song.mp3`;

      await fsp.writeFile(
        path.join(testPlaylistFolder, "test.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      const tracks = await getPlaylist("test.pls");
      expect(tracks).toHaveLength(1);
    });

    it("should throw error for non-existent playlist", async () => {
      const { getPlaylist } = await import("./playlist-service");
      await expect(getPlaylist("nonexistent")).rejects.toThrow();
    });

    it("should handle Windows-style line endings", async () => {
      const plsContent = "[playlist]\r\nFile1=/song.mp3\r\nTitle1=Test\r\n";

      await fsp.writeFile(
        path.join(testPlaylistFolder, "windows.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      const tracks = await getPlaylist("windows");
      expect(tracks).toHaveLength(1);
      expect(tracks[0].file).toBe("/song.mp3");
    });

    it("should ignore empty lines and comments", async () => {
      const plsContent = `[playlist]

File1=/song.mp3

Title1=Test Song

NumberOfEntries=1`;

      await fsp.writeFile(
        path.join(testPlaylistFolder, "whitespace.pls"),
        plsContent
      );

      const { getPlaylist } = await import("./playlist-service");
      const tracks = await getPlaylist("whitespace");
      expect(tracks).toHaveLength(1);
      expect(tracks[0].file).toBe("/song.mp3");
    });
  });

  describe("addTracksToPlaylist", () => {
    it("should create a new playlist with tracks", async () => {
      const { addTracksToPlaylist, getPlaylist } = await import(
        "./playlist-service"
      );
      const newTracks = [
        { file: "/album/song1.mp3", title: "Song 1", length: "180" },
        { file: "/album/song2.mp3", title: "Song 2", length: "240" },
      ];

      const result = await addTracksToPlaylist("newplaylist", newTracks);
      expect(result).toHaveLength(2);
      expect(result).toEqual(newTracks);

      // Verify it was written correctly
      const readTracks = await getPlaylist("newplaylist");
      expect(readTracks).toEqual(newTracks);
    });

    it("should append tracks to existing playlist", async () => {
      const { addTracksToPlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      // Create initial playlist
      const initialTracks = [{ file: "/album/song1.mp3", title: "Song 1" }];
      await addTracksToPlaylist("existing", initialTracks);

      // Add more tracks
      const newTracks = [{ file: "/album/song2.mp3", title: "Song 2" }];
      const result = await addTracksToPlaylist("existing", newTracks);

      expect(result).toHaveLength(2);
      expect(result[0].file).toBe("/album/song1.mp3");
      expect(result[1].file).toBe("/album/song2.mp3");
    });

    it("should handle tracks without optional fields", async () => {
      const { addTracksToPlaylist, getPlaylist } = await import(
        "./playlist-service"
      );
      const newTracks = [{ file: "/album/song.mp3" }];

      await addTracksToPlaylist("minimal", newTracks);

      const readTracks = await getPlaylist("minimal");
      expect(readTracks).toHaveLength(1);
      expect(readTracks[0]).toEqual({ file: "/album/song.mp3" });
    });

    it("should create playlist folder if it doesn't exist", async () => {
      await fsp.rmdir(testPlaylistFolder);
      const { addTracksToPlaylist } = await import("./playlist-service");

      const newTracks = [{ file: "/song.mp3" }];
      await addTracksToPlaylist("test", newTracks);

      const exists = await fsp.stat(testPlaylistFolder);
      expect(exists.isDirectory()).toBe(true);
    });
  });

  describe("removeTrackFromPlaylist", () => {
    it("should remove a track by index", async () => {
      const { addTracksToPlaylist, removeTrackFromPlaylist } = await import(
        "./playlist-service"
      );

      const tracks = [
        { file: "/song1.mp3", title: "Song 1" },
        { file: "/song2.mp3", title: "Song 2" },
        { file: "/song3.mp3", title: "Song 3" },
      ];
      await addTracksToPlaylist("test", tracks);

      const result = await removeTrackFromPlaylist("test", 1);
      expect(result).toHaveLength(2);
      expect(result[0].file).toBe("/song1.mp3");
      expect(result[1].file).toBe("/song3.mp3");
    });

    it("should remove first track", async () => {
      const { addTracksToPlaylist, removeTrackFromPlaylist } = await import(
        "./playlist-service"
      );

      const tracks = [{ file: "/song1.mp3" }, { file: "/song2.mp3" }];
      await addTracksToPlaylist("test", tracks);

      const result = await removeTrackFromPlaylist("test", 0);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe("/song2.mp3");
    });

    it("should remove last track", async () => {
      const { addTracksToPlaylist, removeTrackFromPlaylist } = await import(
        "./playlist-service"
      );

      const tracks = [{ file: "/song1.mp3" }, { file: "/song2.mp3" }];
      await addTracksToPlaylist("test", tracks);

      const result = await removeTrackFromPlaylist("test", 1);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe("/song1.mp3");
    });

    it("should throw error for invalid index (negative)", async () => {
      const { addTracksToPlaylist, removeTrackFromPlaylist } = await import(
        "./playlist-service"
      );

      const tracks = [{ file: "/song1.mp3" }];
      await addTracksToPlaylist("test", tracks);

      await expect(removeTrackFromPlaylist("test", -1)).rejects.toThrow(
        "out of range"
      );
    });

    it("should throw error for invalid index (too large)", async () => {
      const { addTracksToPlaylist, removeTrackFromPlaylist } = await import(
        "./playlist-service"
      );

      const tracks = [{ file: "/song1.mp3" }];
      await addTracksToPlaylist("test", tracks);

      await expect(removeTrackFromPlaylist("test", 5)).rejects.toThrow(
        "out of range"
      );
    });

    it("should throw error for non-existent playlist", async () => {
      const { removeTrackFromPlaylist } = await import("./playlist-service");

      await expect(removeTrackFromPlaylist("nonexistent", 0)).rejects.toThrow();
    });
  });

  describe("createPlaylist", () => {
    it("should create a new empty playlist", async () => {
      const { createPlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("newempty");

      const tracks = await getPlaylist("newempty");
      expect(tracks).toHaveLength(0);
    });

    it("should create playlist file with proper format", async () => {
      const { createPlaylist } = await import("./playlist-service");

      await createPlaylist("formatted");

      const content = await fsp.readFile(
        path.join(testPlaylistFolder, "formatted.pls"),
        "utf-8"
      );
      expect(content).toContain("[playlist]");
      expect(content).toContain("NumberOfEntries=0");
      expect(content).toContain("Version=2");
    });

    it("should throw error if playlist already exists", async () => {
      const { createPlaylist } = await import("./playlist-service");

      await createPlaylist("duplicate");

      await expect(createPlaylist("duplicate")).rejects.toThrow(
        "already exists"
      );
    });

    it("should sanitize playlist name", async () => {
      const { createPlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("../safe");

      // Should create "safe.pls" not "../safe.pls"
      const tracks = await getPlaylist("safe");
      expect(tracks).toHaveLength(0);
    });

    it("should create playlist folder if it doesn't exist", async () => {
      await fsp.rmdir(testPlaylistFolder);
      const { createPlaylist } = await import("./playlist-service");

      await createPlaylist("test");

      const exists = await fsp.stat(testPlaylistFolder);
      expect(exists.isDirectory()).toBe(true);
    });
  });

  describe("deletePlaylist", () => {
    it("should delete an existing playlist", async () => {
      const { createPlaylist, deletePlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("todelete");
      await deletePlaylist("todelete");

      // Verify it's deleted
      const exists = await fsp
        .access(path.join(testPlaylistFolder, "todelete.pls"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });

    it("should throw error for non-existent playlist", async () => {
      const { deletePlaylist } = await import("./playlist-service");

      await expect(deletePlaylist("nonexistent")).rejects.toThrow();
    });

    it("should sanitize playlist name", async () => {
      const { createPlaylist, deletePlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("deletesafe");
      await deletePlaylist("../deletesafe");

      // Should delete "deletesafe.pls" not "../deletesafe.pls"
      const exists = await fsp
        .access(path.join(testPlaylistFolder, "deletesafe.pls"))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(false);
    });
  });

  describe("renamePlaylist", () => {
    it("should rename an existing playlist", async () => {
      const { createPlaylist, renamePlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      // Create a playlist with some tracks
      await createPlaylist("oldname");
      const tracks = [
        { file: "/song1.mp3", title: "Song 1" },
        { file: "/song2.mp3", title: "Song 2" },
      ];
      await fsp.writeFile(
        path.join(testPlaylistFolder, "oldname.pls"),
        `[playlist]\nFile1=/song1.mp3\nTitle1=Song 1\nFile2=/song2.mp3\nTitle2=Song 2\nNumberOfEntries=2\nVersion=2\n`,
        "utf-8"
      );

      // Rename it
      await renamePlaylist("oldname", "newname");

      // Old name should not exist
      const oldExists = await fsp
        .access(path.join(testPlaylistFolder, "oldname.pls"))
        .then(() => true)
        .catch(() => false);
      expect(oldExists).toBe(false);

      // New name should exist with same content
      const newTracks = await getPlaylist("newname");
      expect(newTracks).toHaveLength(2);
      expect(newTracks[0].file).toBe("/song1.mp3");
      expect(newTracks[1].file).toBe("/song2.mp3");
    });

    it("should throw error if source playlist does not exist", async () => {
      const { renamePlaylist } = await import("./playlist-service");

      await expect(renamePlaylist("nonexistent", "newname")).rejects.toThrow(
        'Playlist "nonexistent" not found'
      );
    });

    it("should throw error if target playlist already exists", async () => {
      const { createPlaylist, renamePlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("existing1");
      await createPlaylist("existing2");

      await expect(renamePlaylist("existing1", "existing2")).rejects.toThrow(
        'Playlist "existing2" already exists'
      );
    });

    it("should sanitize both old and new playlist names", async () => {
      const { createPlaylist, renamePlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("safe");
      await renamePlaylist("../safe", "../../newsafe");

      // Should rename "safe.pls" to "newsafe.pls" (both sanitized)
      const oldExists = await fsp
        .access(path.join(testPlaylistFolder, "safe.pls"))
        .then(() => true)
        .catch(() => false);
      expect(oldExists).toBe(false);

      const newExists = await fsp
        .access(path.join(testPlaylistFolder, "newsafe.pls"))
        .then(() => true)
        .catch(() => false);
      expect(newExists).toBe(true);
    });

    it("should handle playlist names with .pls extension", async () => {
      const { createPlaylist, renamePlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      await createPlaylist("test.pls");
      await renamePlaylist("test.pls", "renamed.pls");

      // Should work and strip .pls from both names
      const tracks = await getPlaylist("renamed");
      expect(tracks).toHaveLength(0);
    });

    it("should preserve playlist content after rename", async () => {
      const { addTracksToPlaylist, renamePlaylist, getPlaylist } = await import(
        "./playlist-service"
      );

      // Create playlist with tracks
      const originalTracks = [
        { file: "/album/track1.mp3", title: "Track 1", length: "180" },
        { file: "/album/track2.mp3", title: "Track 2", length: "200" },
        { file: "/album/track3.mp3", title: "Track 3", length: "220" },
      ];
      await addTracksToPlaylist("original", originalTracks);

      // Rename it
      await renamePlaylist("original", "renamed");

      // Verify all tracks are preserved
      const tracks = await getPlaylist("renamed");
      expect(tracks).toHaveLength(3);
      expect(tracks[0]).toEqual(originalTracks[0]);
      expect(tracks[1]).toEqual(originalTracks[1]);
      expect(tracks[2]).toEqual(originalTracks[2]);
    });
  });
});
