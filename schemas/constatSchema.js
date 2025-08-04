const Joi = require("joi");

const constatSchema = Joi.object({
  // Champs de la partie 1 (General_Info)
  date: Joi.date().required(),
  time: Joi.string().required(),
  location: Joi.string().required(),
  injuries: Joi.boolean().required(),
  otherDamages: Joi.boolean().required(),
  witnesses: Joi.boolean(),

  // Champs de la partie 2 (VehiculeA)
  insuredVehicle: Joi.string().required(),
  contractNumber: Joi.string().required(),
  agency: Joi.string().required(),
  validFrom: Joi.date().required(),
  validTo: Joi.date().required(),
  driverLastName: Joi.string().required(),
  driverFirstName: Joi.string().required(),
  driverAddress: Joi.string().required(),
  driverLicenseNumber: Joi.string().required(),
  licenseIssueDate: Joi.date().required(),
  insuredLastName: Joi.string().required(),
  insuredFirstName: Joi.string().required(),
  insuredAddress: Joi.string().required(),
  insuredPhone: Joi.string().required(),
  vehicleBrand: Joi.string().required(),
  vehicleRegistration: Joi.string(),
  vehicleType: Joi.string().required(),
  face: Joi.string().required(),
  direction: Joi.string().required(),
  comingFrom: Joi.string().required(),
  goingTo: Joi.string().required(),
  damageDescription: Joi.string().required(),
  circumstances: Joi.object().required(),
  numberOfCheckedBoxes: Joi.number().required(),
  // voiceRecordings: Joi.array().items(Joi.string()),

  frontImage: Joi.string().required(), // Allow empty string or valid URI
  backImage: Joi.string().required(),
  leftImage: Joi.string().required(),
  rightImage: Joi.string().required(),
  accidentId: Joi.string().required(),
});

module.exports = constatSchema;
