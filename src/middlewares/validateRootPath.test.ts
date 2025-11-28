import { Request, Response, NextFunction } from "express";
import validateRootPath from "./validateRootPath";

// Mock server-config module
jest.mock("../services/server-config", () => ({
  getFullPath: jest.fn((input: string = "") => `/media/${input}`),
  insideRoot: jest.fn((path: string) => path.startsWith("/media")),
}));

import { getFullPath, insideRoot } from "../services/server-config";

describe("validateRootPath middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      query: {},
    };
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
    (insideRoot as jest.Mock).mockImplementation((path: string) =>
      path.startsWith("/media")
    );
  });

  it("should call next() when path is inside root", () => {
    mockRequest.query = { path: "album" };
    (getFullPath as jest.Mock).mockReturnValue("/media/album");

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
    (getFullPath as jest.Mock).mockReturnValue("/media");

    validateRootPath(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it("should return 403 when path is outside root", () => {
    mockRequest.query = { path: "../etc/passwd" };
    (getFullPath as jest.Mock).mockReturnValue("/etc/passwd");
    (insideRoot as jest.Mock).mockReturnValue(false);

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
