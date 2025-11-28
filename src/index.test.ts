import request from "supertest";
import path from "path";
import fs from "fs";

// Set up test environment before importing app
const testMediaDir = path.join(__dirname, "__test_media__");

beforeAll(() => {
  // Set environment variables for testing
  process.env.MM_FOLDER = testMediaDir;
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
});

afterAll(() => {
  // Clean up test directory
  fs.rmSync(testMediaDir, { recursive: true, force: true });
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

    it("should return 403 for path traversal attempt", async () => {
      const app = getApp();
      const response = await request(app)
        .get("/list?path=../etc/passwd")
        .expect(403);

      expect(response.body.error).toContain("outside the configured media folder");
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

      expect(response.body.error).toContain("outside the configured media folder");
    });
  });
});
