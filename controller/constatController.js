// store/constatStore.js
const Constat = require("../models/Constat");

// Ajouter un constat
const addConstat = async (constatData) => {
  const newConstat = new Constat(constatData);
  await newConstat.save();
  return newConstat;
};

// Récupérer un constat par ID
const getConstatById = async (id) => {
  return await Constat.findById(id);
};

// Récupérer tous les constats
const getAllConstats = async () => {
  return await Constat.find();
};

module.exports = {
  addConstat,
  getConstatById,
  getAllConstats,
};
