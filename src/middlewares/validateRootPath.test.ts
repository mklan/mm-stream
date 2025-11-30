import { Request, Response, NextFunction } from "express";
import validateRootPath from "./validateRootPath";

// Mock server-config module
vi.mock("../services/server-config", () => ({
  getFullPath: vi.fn((input: string = "") => `/media/${input}`),
  insideRoot: vi.fn((path: string) => path.startsWith("/media")),
}));

import { getFullPath, insideRoot } from "../services/server-config";

describe("validateRootPath middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      query: {},
    };
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = vi.fn();

    // Reset mock behavior
    vi.clearAllMocks();
    (insideRoot as any).mockImplementation((path: string) =>
      path.startsWith("/media")
    );
  });

  it("should call next() when path is inside root", () => {
    mockRequest.query = { path: "album" };
    (getFullPath as any).mockReturnValue("/media/album");

    validateRootPath(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("should call next() when no path is provided", () => {
    mockRequest.query = {};
    (getFullPath as any).mockReturnValue("/media");

    validateRootPath(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it("should return 403 when path is outside root", () => {
    mockRequest.query = { path: "../etc/passwd" };
    (getFullPath as any).mockReturnValue("/etc/passwd");
    (insideRoot as any).mockReturnValue(false);

    validateRootPath(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Access denied: path is outside the configured media folder",
    });
  });

  it("should return 400 for invalid path parameter type (array)", () => {
    mockRequest.query = { path: ["path1", "path2"] };

    validateRootPath(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      error: "Invalid path parameter",
    });
  });
});
