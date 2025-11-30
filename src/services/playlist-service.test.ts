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
    jest.resetModules();

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
      const { getPlaylists } = require("./playlist-service");
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

      const { getPlaylists } = require("./playlist-service");
      const playlists = await getPlaylists();
      expect(playlists).toEqual(
        expect.arrayContaining(["playlist1", "playlist2"])
      );
      expect(playlists).toHaveLength(2);
    });

    it("should handle empty playlist folder", async () => {
      const { getPlaylists } = require("./playlist-service");
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

      const { getPlaylists } = require("./playlist-service");
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

      const { getPlaylist } = require("./playlist-service");
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

      const { getPlaylist } = require("./playlist-service");
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

      const { getPlaylist } = require("./playlist-service");
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

      const { getPlaylist } = require("./playlist-service");
      const tracks = await getPlaylist("test.pls");
      expect(tracks).toHaveLength(1);
    });

    it("should throw error for non-existent playlist", async () => {
      const { getPlaylist } = require("./playlist-service");
      await expect(getPlaylist("nonexistent")).rejects.toThrow();
    });

    it("should handle Windows-style line endings", async () => {
      const plsContent = "[playlist]\r\nFile1=/song.mp3\r\nTitle1=Test\r\n";

      await fsp.writeFile(
        path.join(testPlaylistFolder, "windows.pls"),
        plsContent
      );

      const { getPlaylist } = require("./playlist-service");
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

      const { getPlaylist } = require("./playlist-service");
      const tracks = await getPlaylist("whitespace");
      expect(tracks).toHaveLength(1);
      expect(tracks[0].file).toBe("/song.mp3");
    });
  });

  describe("addTracksToPlaylist", () => {
    it("should create a new playlist with tracks", async () => {
      const {
        addTracksToPlaylist,
        getPlaylist,
      } = require("./playlist-service");
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
      const {
        addTracksToPlaylist,
        getPlaylist,
      } = require("./playlist-service");

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
      const {
        addTracksToPlaylist,
        getPlaylist,
      } = require("./playlist-service");
      const newTracks = [{ file: "/album/song.mp3" }];

      await addTracksToPlaylist("minimal", newTracks);

      const readTracks = await getPlaylist("minimal");
      expect(readTracks).toHaveLength(1);
      expect(readTracks[0]).toEqual({ file: "/album/song.mp3" });
    });

    it("should create playlist folder if it doesn't exist", async () => {
      await fsp.rmdir(testPlaylistFolder);
      const { addTracksToPlaylist } = require("./playlist-service");

      const newTracks = [{ file: "/song.mp3" }];
      await addTracksToPlaylist("test", newTracks);

      const exists = await fsp.stat(testPlaylistFolder);
      expect(exists.isDirectory()).toBe(true);
    });
  });

  describe("removeTrackFromPlaylist", () => {
    it("should remove a track by index", async () => {
      const {
        addTracksToPlaylist,
        removeTrackFromPlaylist,
      } = require("./playlist-service");

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
      const {
        addTracksToPlaylist,
        removeTrackFromPlaylist,
      } = require("./playlist-service");

      const tracks = [{ file: "/song1.mp3" }, { file: "/song2.mp3" }];
      await addTracksToPlaylist("test", tracks);

      const result = await removeTrackFromPlaylist("test", 0);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe("/song2.mp3");
    });

    it("should remove last track", async () => {
      const {
        addTracksToPlaylist,
        removeTrackFromPlaylist,
      } = require("./playlist-service");

      const tracks = [{ file: "/song1.mp3" }, { file: "/song2.mp3" }];
      await addTracksToPlaylist("test", tracks);

      const result = await removeTrackFromPlaylist("test", 1);
      expect(result).toHaveLength(1);
      expect(result[0].file).toBe("/song1.mp3");
    });

    it("should throw error for invalid index (negative)", async () => {
      const {
        addTracksToPlaylist,
        removeTrackFromPlaylist,
      } = require("./playlist-service");

      const tracks = [{ file: "/song1.mp3" }];
      await addTracksToPlaylist("test", tracks);

      await expect(removeTrackFromPlaylist("test", -1)).rejects.toThrow(
        "out of range"
      );
    });

    it("should throw error for invalid index (too large)", async () => {
      const {
        addTracksToPlaylist,
        removeTrackFromPlaylist,
      } = require("./playlist-service");

      const tracks = [{ file: "/song1.mp3" }];
      await addTracksToPlaylist("test", tracks);

      await expect(removeTrackFromPlaylist("test", 5)).rejects.toThrow(
        "out of range"
      );
    });

    it("should throw error for non-existent playlist", async () => {
      const { removeTrackFromPlaylist } = require("./playlist-service");

      await expect(removeTrackFromPlaylist("nonexistent", 0)).rejects.toThrow();
    });
  });
});
