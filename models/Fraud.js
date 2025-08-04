const mongoose = require("mongoose");

const fraudSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  nvConstat: { type: mongoose.Schema.Types.ObjectId, ref: "Constat" },
  ancienConstat: { type: mongoose.Schema.Types.ObjectId, ref: "Constat" },
  similarity: String,
  imagesCompared: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Fraud", fraudSchema);
