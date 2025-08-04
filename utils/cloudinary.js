const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dy43p9ixi",
  api_key: "116352692973518",
  api_secret: "OxYRL-Dw01-3rdGgSDwxY1zSAo0",
  secure: true,
});

module.exports = cloudinary;
