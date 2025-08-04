const mongoose = require("mongoose");

const accidentSchema = new mongoose.Schema(
  {
    accidentId: { type: String, unique: true, required: true }, //l’ID unique généré par le front-end (via uuidv4)
    totalVehicles: { type: Number, required: true },
    submittedVehicles: { type: Number, default: 0 }, //combien de constats ont été soumis pour cet accident
    isComplete: {
      type: Boolean,
      default: false,
 
    },
  },
  { timestamps: true }
);

const Accident = mongoose.model("Accident", accidentSchema);

module.exports = Accident;
