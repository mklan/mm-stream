const { getFullPath, insideRoot } = require("../services/server-config");

const validateRootPath = (req, res, next) => {
  const filePath = getFullPath(req.query.path);

  if (!insideRoot(filePath)) {
    res.send("path is not inside the configured media folder!");
  }
  next();
};

module.exports = validateRootPath;
