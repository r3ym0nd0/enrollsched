const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.join(__dirname, "..", "..", "uploads", "pre-registration");

fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, uploadRoot);
  },
  filename: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeField = file.fieldname.replace(/[^a-z0-9_-]/gi, "");
    const uniqueName = `${safeField}-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, uniqueName);
  }
});

function fileFilter(req, file, callback) {
  const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new Error("Only JPG, PNG, or WEBP evidence images are allowed."));
  }

  return callback(null, true);
}

const uploadEvidenceFields = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
}).fields([
  { name: "comEvidence", maxCount: 1 },
  { name: "receiptEvidence", maxCount: 1 }
]);

function uploadEvidence(req, res, next) {
  uploadEvidenceFields(req, res, (error) => {
    if (!error) {
      return next();
    }

    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "Evidence images must be 5MB or smaller."
        : error.message || "Unable to upload evidence images.";

    return res.status(400).json({ message });
  });
}

function removeUploadedEvidence(files = {}) {
  Object.values(files)
    .flat()
    .filter(Boolean)
    .forEach((file) => {
      fs.unlink(file.path, () => {});
    });
}

function getEvidencePath(file) {
  return file ? `/uploads/pre-registration/${file.filename}` : null;
}

module.exports = {
  getEvidencePath,
  removeUploadedEvidence,
  uploadEvidence,
  uploadRoot
};
