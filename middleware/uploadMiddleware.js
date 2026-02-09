const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 105 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
