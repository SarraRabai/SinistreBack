const mongoose = require("mongoose");
const { parseDate } = require("../middleware/dateUtils");
const vehiculeSchema = new mongoose.Schema({
  brand: { type: String, required: true },
  numeroSerie: { type: String, required: true },
  numeroMatricule: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  assure: { type: String, required: true },
  numeroContrat: { type: String, required: true },
  agence: { type: String, required: true },
  insuranceStartDate: { type: Date, required: true },
  insuranceEndDate: { type: Date, required: true },
});

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, minlength: 2 },
    prenom: { type: String, required: true },
    cin: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 5 },
    numeroTelephone: { type: String, required: true },
    adresse: { type: String, required: true },
    email: { type: String, required: true },
    numeroPermis: { type: String, required: true },
    dateDelivrance: {
      type: Date,
      required: true,
      set: (value) => parseDate(value),
    },
    dateExpiration: {
      type: Date,
      required: true,
      set: (value) => parseDate(value),
    },
    categoriesPermis: [],
    vehicules: [vehiculeSchema],
  },
  // createdAt, updatedAt
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
