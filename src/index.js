const express = require("express");
const cors = require("cors");
const ms = require("mediaserver");

const validateRootPath = require("./middlewares/validateRootPath");
const getContent = require("./services/directory-service");
const { port, getFullPath } = require("./services/server-config");

const app = express();

app.use(cors());
app.use("/stream", validateRootPath);
app.use("/list", validateRootPath);

app.get("/stream", (req, res) => {
  ms.pipe(
    req,
    res,
    getFullPath(req.query.path)
  );
});

app.get("/list", async (req, res) => {
  try {
    const entries = await getContent(req.query.path);
    res.send(entries);
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, () => console.log(`listening on port ${port}!`));
