import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import ms from "mediaserver";

import validateRootPath from "./middlewares/validateRootPath";
import getContent from "./services/directory-service";
import { port, getFullPath } from "./services/server-config";
import {
  getPlaylists,
  getPlaylist,
  addTracksToPlaylist,
  removeTrackFromPlaylist,
} from "./services/playlist-service";

const app = express();

app.use(cors());
app.use(express.json()); // Parse JSON request bodies
app.use("/stream", validateRootPath);
app.use("/list", validateRootPath);

app.get("/stream", (req: Request, res: Response) => {
  const filePath = req.query.path as string | undefined;
  ms.pipe(req, res, getFullPath(filePath));
});

app.get("/list", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestedPath = req.query.path as string | undefined;
    const entries = await getContent(requestedPath);
    res.json(entries);
  } catch (error) {
    next(error);
  }
});

app.get(
  "/playlists",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const playlists = await getPlaylists();
      res.json(playlists);
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/playlist/:name",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playlistName = req.params.name;
      const tracks = await getPlaylist(playlistName);
      res.json(tracks);
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/playlist/:name",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playlistName = req.params.name;
      const tracks = req.body;

      if (!Array.isArray(tracks)) {
        res
          .status(400)
          .json({ error: "Request body must be an array of tracks" });
        return;
      }

      const updatedTracks = await addTracksToPlaylist(playlistName, tracks);
      res.json(updatedTracks);
    } catch (error) {
      next(error);
    }
  }
);

app.delete(
  "/playlist/:name/track/:index",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const playlistName = req.params.name;
      const trackIndex = parseInt(req.params.index, 10);

      if (isNaN(trackIndex)) {
        res.status(400).json({ error: "Track index must be a valid number" });
        return;
      }

      const updatedTracks = await removeTrackFromPlaylist(
        playlistName,
        trackIndex
      );
      res.json(updatedTracks);
    } catch (error) {
      next(error);
    }
  }
);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// Export app for testing
export { app };

// Only start server if this file is run directly
if (require.main === module) {
  app.listen(port, () => console.log(`listening on port ${port}!`));
}
