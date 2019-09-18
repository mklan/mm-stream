const express = require("express");
const ms = require("mediaserver");
require("dotenv").config();

const ip = require("ip");
const validateRootPath = require("./middlewares/validateRootPath");
const getContent = require("./services/directory-service");

const app = express();
const port = process.env.MM_PORT || 3000;
const host = process.env.MM_HOST || ip.address() + ":" + port;

app.use("/stream", validateRootPath);
app.use("/list", validateRootPath);

app.get("/stream", (req, res) => {
  ms.pipe(
    req,
    res,
    req.query.fullPath
  );
});

app.get("/list", async (req, res) => {
  try {
    const entries = await getContent(req.query.fullPath, host);
    res.send([
      {
        up: `http://${host}/list?path=${entries[0].path.replace(
          encodeURIComponent(entries[0].name),
          ""
        )}/..`
      },
      ...entries
    ]);
  } catch (e) {
    console.log(e);
  }
});

app.listen(port, () => console.log(`listening on port ${port}!`));
