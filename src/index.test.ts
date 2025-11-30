import request from "supertest";
import path from "path";
import fs from "fs";

// Set up test environment before importing app
const testMediaDir = path.join(__dirname, "__test_media__");
const testPlaylistDir = path.join(__dirname, "__test_playlists__");

beforeAll(() => {
  // Set environment variables for testing
  process.env.MM_FOLDER = testMediaDir;
  process.env.MM_PLAYLIST_FOLDER = testPlaylistDir;
  process.env.MM_HOST = "http://localhost:3000";
  process.env.MM_PORT = "3000";

  // Create test media directory structure
  if (!fs.existsSync(testMediaDir)) {
    fs.mkdirSync(testMediaDir, { recursive: true });
  }
  const albumDir = path.join(testMediaDir, "album");
  if (!fs.existsSync(albumDir)) {
    fs.mkdirSync(albumDir, { recursive: true });
  }

  // Create test files
  fs.writeFileSync(path.join(albumDir, "song.mp3"), "fake mp3 content");
  fs.writeFileSync(path.join(albumDir, "track.flac"), "fake flac content");
  fs.writeFileSync(path.join(albumDir, "audio.ogg"), "fake ogg content");
  fs.writeFileSync(path.join(albumDir, "readme.txt"), "not an audio file");

  // Create test playlist directory and files
  if (!fs.existsSync(testPlaylistDir)) {
    fs.mkdirSync(testPlaylistDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(testPlaylistDir, "favorites.pls"),
    `[playlist]
File1=/album/song.mp3
Title1=Favorite Song
Length1=180
NumberOfEntries=1`
  );
  fs.writeFileSync(
    path.join(testPlaylistDir, "rock.pls"),
    `[playlist]
File1=/album/track.flac
Title1=Rock Track
File2=/album/audio.ogg
Title2=Another Rock Song
NumberOfEntries=2`
  );
});

afterAll(() => {
  // Clean up test directories
  fs.rmSync(testMediaDir, { recursive: true, force: true });
  fs.rmSync(testPlaylistDir, { recursive: true, force: true });
});

// Import app after setting up environment
// Use require to ensure environment is set first
const getApp = () => {
  // Clear module cache to ensure fresh app with test environment
  jest.resetModules();
  return require("./index").app;
};

describe("API Integration Tests", () => {
  describe("GET /list", () => {
    it("should list contents of root folder", async () => {
      const app = getApp();
      const response = await request(app).get("/list").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have the album directory
      const albumEntry = response.body.find(
        (entry: { name: string }) => entry.name === "album"
      );
      expect(albumEntry).toBeDefined();
      expect(albumEntry.isFile).toBe(false);
    });

    it("should list contents of subdirectory", async () => {
      const app = getApp();
      const response = await request(app).get("/list?path=album").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have parent link and audio files only
      const names = response.body.map((entry: { name: string }) => entry.name);
      expect(names).toContain("..");
      expect(names).toContain("song.mp3");
      expect(names).toContain("track.flac");
      expect(names).toContain("audio.ogg");
      // Should NOT contain non-audio files
      expect(names).not.toContain("readme.txt");
    });

    it("should include correct metadata for files", async () => {
      const app = getApp();
      const response = await request(app).get("/list?path=album").expect(200);

      const mp3Entry = response.body.find(
        (entry: { name: string }) => entry.name === "song.mp3"
      );
      expect(mp3Entry).toBeDefined();
      expect(mp3Entry.isFile).toBe(true);
      expect(mp3Entry.size).toBeGreaterThan(0);
      expect(mp3Entry.enter).toContain("/stream?path=");
    });

    it("should include correct enter URL for directories", async () => {
      const app = getApp();
      const response = await request(app).get("/list").expect(200);

      const albumEntry = response.body.find(
        (entry: { name: string }) => entry.name === "album"
      );
      expect(albumEntry.enter).toContain("/list?path=");
    });

    it("should have parent link with safe path (no .. traversal)", async () => {
      const app = getApp();
      const response = await request(app).get("/list?path=album").expect(200);

      const parentEntry = response.body.find(
        (entry: { name: string }) => entry.name === ".."
      );
      expect(parentEntry).toBeDefined();
      // Parent path should not contain '..' - it should be the resolved empty path (root)
      expect(parentEntry.path).not.toContain("..");
    });

    it("should return 403 for path traversal attempt", async () => {
      const app = getApp();
      const response = await request(app)
        .get("/list?path=../etc/passwd")
        .expect(403);

      expect(response.body.error).toContain(
        "outside the configured media folder"
      );
    });

    it("should return 500 for non-existent path", async () => {
      const app = getApp();
      await request(app).get("/list?path=nonexistent").expect(500);
    });
  });

  describe("GET /stream", () => {
    it("should return 403 for path traversal attempt", async () => {
      const app = getApp();
      const response = await request(app)
        .get("/stream?path=../etc/passwd")
        .expect(403);

      expect(response.body.error).toContain(
        "outside the configured media folder"
      );
    });
  });

  describe("GET /playlists", () => {
    it("should return list of playlist names", async () => {
      const app = getApp();
      const response = await request(app).get("/playlists").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain("favorites");
      expect(response.body).toContain("rock");
      expect(response.body).toHaveLength(2);
    });

    it("should return empty array when no playlists exist", async () => {
      // Remove playlist files temporarily
      fs.rmSync(testPlaylistDir, { recursive: true, force: true });

      const app = getApp();
      const response = await request(app).get("/playlists").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(0);

      // Restore playlist directory for other tests
      fs.mkdirSync(testPlaylistDir, { recursive: true });
      fs.writeFileSync(
        path.join(testPlaylistDir, "favorites.pls"),
        `[playlist]
File1=/album/song.mp3
Title1=Favorite Song
Length1=180
NumberOfEntries=1`
      );
      fs.writeFileSync(
        path.join(testPlaylistDir, "rock.pls"),
        `[playlist]
File1=/album/track.flac
Title1=Rock Track
File2=/album/audio.ogg
Title2=Another Rock Song
NumberOfEntries=2`
      );
    });
  });

  describe("GET /playlist/:name", () => {
    it("should return tracks from a playlist", async () => {
      const app = getApp();
      const response = await request(app)
        .get("/playlist/favorites")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        file: "/album/song.mp3",
        title: "Favorite Song",
        length: "180",
      });
    });

    it("should return multiple tracks from a playlist", async () => {
      const app = getApp();
      const response = await request(app).get("/playlist/rock").expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].file).toBe("/album/track.flac");
      expect(response.body[1].file).toBe("/album/audio.ogg");
    });

    it("should handle playlist name with .pls extension", async () => {
      const app = getApp();
      const response = await request(app)
        .get("/playlist/favorites.pls")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });

    it("should return 500 for non-existent playlist", async () => {
      const app = getApp();
      await request(app).get("/playlist/nonexistent").expect(500);
    });

    it("should sanitize playlist name to prevent path traversal", async () => {
      const app = getApp();
      // Path traversal in the param is sanitized by path.basename
      const response = await request(app)
        .get("/playlist/..%2Ffavorites")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
    });
  });
});
