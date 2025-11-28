import path from "path";

// Store original environment
const originalEnv = { ...process.env };

// Mock the ip module
jest.mock("ip", () => ({
  address: () => "192.168.1.100",
}));

describe("server-config", () => {
  beforeEach(() => {
    // Clear module cache to reset config between tests
    jest.resetModules();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("parsePort", () => {
    it("should use default port 3000 when MM_PORT is not set", () => {
      delete process.env.MM_PORT;
      const { port } = require("./server-config");
      expect(port).toBe(3000);
    });

    it("should parse MM_PORT when set to a valid number", () => {
      process.env.MM_PORT = "8080";
      const { port } = require("./server-config");
      expect(port).toBe(8080);
    });

    it("should return default port for invalid port string", () => {
      process.env.MM_PORT = "invalid";
      const { port } = require("./server-config");
      expect(port).toBe(3000);
    });

    it("should return default port for port out of range", () => {
      process.env.MM_PORT = "70000";
      const { port } = require("./server-config");
      expect(port).toBe(3000);
    });

    it("should return default port for negative port", () => {
      process.env.MM_PORT = "-1";
      const { port } = require("./server-config");
      expect(port).toBe(3000);
    });
  });

  describe("host", () => {
    it("should use MM_HOST when set", () => {
      process.env.MM_HOST = "http://example.com:3000";
      const { host } = require("./server-config");
      expect(host).toBe("http://example.com:3000");
    });

    it("should generate host from IP when MM_HOST is not set", () => {
      delete process.env.MM_HOST;
      delete process.env.MM_PORT;
      const { host } = require("./server-config");
      expect(host).toBe("http://192.168.1.100:3000");
    });
  });

  describe("rootFolder", () => {
    it("should use MM_FOLDER when set", () => {
      process.env.MM_FOLDER = "/custom/media";
      const { rootFolder } = require("./server-config");
      expect(rootFolder).toBe(path.resolve("/custom/media"));
    });

    it("should use default ./media when MM_FOLDER is not set", () => {
      delete process.env.MM_FOLDER;
      const { rootFolder } = require("./server-config");
      expect(rootFolder).toBe(path.resolve("./media"));
    });
  });

  describe("getFullPath", () => {
    it("should return root folder when no path is provided", () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath, rootFolder } = require("./server-config");
      expect(getFullPath()).toBe(path.resolve(rootFolder));
    });

    it("should join path with root folder", () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath } = require("./server-config");
      expect(getFullPath("album/song.mp3")).toBe(
        path.resolve("/media/album/song.mp3")
      );
    });

    it("should normalize path traversal attempts", () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath } = require("./server-config");
      const result = getFullPath("../etc/passwd");
      expect(result).toBe(path.resolve("/media/../etc/passwd"));
    });
  });

  describe("isRootFolder", () => {
    it('should return true for "." path', () => {
      const { isRootFolder } = require("./server-config");
      expect(isRootFolder(".")).toBe(true);
    });

    it("should return true for empty path", () => {
      const { isRootFolder } = require("./server-config");
      expect(isRootFolder("")).toBe(true);
    });

    it("should return false for non-root paths", () => {
      const { isRootFolder } = require("./server-config");
      expect(isRootFolder("album")).toBe(false);
    });
  });

  describe("insideRoot", () => {
    it("should return true for paths inside root folder", () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = require("./server-config");
      expect(insideRoot(`${rootFolder}/album`)).toBe(true);
    });

    it("should return true for root folder itself", () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = require("./server-config");
      expect(insideRoot(rootFolder)).toBe(true);
    });

    it("should return false for paths outside root folder", () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot } = require("./server-config");
      expect(insideRoot("/etc/passwd")).toBe(false);
    });

    it("should return false for path traversal attempts", () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = require("./server-config");
      // Resolved path would be /etc/passwd, not inside /media
      expect(insideRoot(`${rootFolder}/../etc/passwd`)).toBe(false);
    });
  });
});
