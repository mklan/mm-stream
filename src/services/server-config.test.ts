import path from "path";

// Store original environment
const originalEnv = { ...process.env };

// Mock the ip module
vi.mock("ip", () => ({
  default: {
    address: () => "192.168.1.100",
  },
  address: () => "192.168.1.100",
}));

describe("server-config", () => {
  beforeEach(() => {
    // Clear module cache to reset config between tests
    vi.resetModules();
    // Reset environment variables
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("parsePort", () => {
    it("should use default port 3000 when MM_PORT is not set", async () => {
      delete process.env.MM_PORT;
      const { port } = await import("./server-config");
      expect(port).toBe(3000);
    });

    it("should parse MM_PORT when set to a valid number", async () => {
      process.env.MM_PORT = "8080";
      const { port } = await import("./server-config");
      expect(port).toBe(8080);
    });

    it("should return default port for invalid port string", async () => {
      process.env.MM_PORT = "invalid";
      const { port } = await import("./server-config");
      expect(port).toBe(3000);
    });

    it("should return default port for port out of range", async () => {
      process.env.MM_PORT = "70000";
      const { port } = await import("./server-config");
      expect(port).toBe(3000);
    });

    it("should return default port for negative port", async () => {
      process.env.MM_PORT = "-1";
      const { port } = await import("./server-config");
      expect(port).toBe(3000);
    });
  });

  describe("baseUrl", () => {
    it("should use MM_HOST when set", async () => {
      process.env.MM_HOST = "http://example.com:3000";
      const { baseUrl } = await import("./server-config");
      expect(baseUrl).toBe("http://example.com:3000");
    });

    it("should generate baseUrl from IP when MM_HOST is not set", async () => {
      delete process.env.MM_HOST;
      delete process.env.MM_PORT;
      const { baseUrl } = await import("./server-config");
      expect(baseUrl).toBe("http://192.168.1.100:3000");
    });
  });

  describe("rootFolder", () => {
    it("should use MM_FOLDER when set", async () => {
      process.env.MM_FOLDER = "/custom/media";
      const { rootFolder } = await import("./server-config");
      expect(rootFolder).toBe(path.resolve("/custom/media"));
    });

    it("should use default ./media when MM_FOLDER is not set", async () => {
      delete process.env.MM_FOLDER;
      const { rootFolder } = await import("./server-config");
      expect(rootFolder).toBe(path.resolve("./media"));
    });
  });

  describe("getFullPath", () => {
    it("should return root folder when no path is provided", async () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath, rootFolder } = await import("./server-config");
      expect(getFullPath()).toBe(path.resolve(rootFolder));
    });

    it("should join path with root folder", async () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath } = await import("./server-config");
      expect(getFullPath("album/song.mp3")).toBe(
        path.resolve("/media/album/song.mp3")
      );
    });

    it("should normalize path traversal attempts", async () => {
      process.env.MM_FOLDER = "/media";
      const { getFullPath } = await import("./server-config");
      const result = getFullPath("../etc/passwd");
      expect(result).toBe(path.resolve("/media/../etc/passwd"));
    });
  });

  describe("isRootFolder", () => {
    it('should return true for "." path', async () => {
      const { isRootFolder } = await import("./server-config");
      expect(isRootFolder(".")).toBe(true);
    });

    it("should return true for empty path", async () => {
      const { isRootFolder } = await import("./server-config");
      expect(isRootFolder("")).toBe(true);
    });

    it("should return false for non-root paths", async () => {
      const { isRootFolder } = await import("./server-config");
      expect(isRootFolder("album")).toBe(false);
    });
  });

  describe("insideRoot", () => {
    it("should return true for paths inside root folder", async () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = await import("./server-config");
      expect(insideRoot(`${rootFolder}/album`)).toBe(true);
    });

    it("should return true for root folder itself", async () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = await import("./server-config");
      expect(insideRoot(rootFolder)).toBe(true);
    });

    it("should return false for paths outside root folder", async () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot } = await import("./server-config");
      expect(insideRoot("/etc/passwd")).toBe(false);
    });

    it("should return false for path traversal attempts", async () => {
      process.env.MM_FOLDER = "/media";
      const { insideRoot, rootFolder } = await import("./server-config");
      // Resolved path would be /etc/passwd, not inside /media
      expect(insideRoot(`${rootFolder}/../etc/passwd`)).toBe(false);
    });
  });
});
