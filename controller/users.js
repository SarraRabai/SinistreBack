const Accident = require("../models/Accident");
const Constat = require("../models/Constat");
const Fraud = require("../models/Fraud");
const User = require("../models/User");

const getUsers = async () => {
  return await User.find();
};

const getUserById = async (id) => {
  return await User.findById(id);
};

const getUserByCin = async (cin) => {
  return await User.findOne({ cin });
};

const addUser = async (user) => {
  const newUser = new User(user);
  await newUser.save();
  return newUser;
};

const updateUser = async (user) => {
  return await User.findByIdAndUpdate(user._id, user, { new: true });
};

const addVehiculeToUser = async (userId, vehicule) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("Utilisateur non trouvé.");
  }

  user.vehicules.push(vehicule);
  await user.save();
  return user;
};

const getUsersForSidebar = async (req, res) => {
  try {
    const filteredUsers = await User.find().select("-password");

    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("Error in getUsersForSidebar: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    let findUser = await User.findById({ _id: req.user._id });
    if (!findUser) return res.status(400).json({ error: "Invalid token" });
    res.status(200).json({ data: findUser });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUser = async (userId) => {
  try {
    // Vérifier si l'utilisateur existe
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Trouver tous les constats associés à l'utilisateur
    const constats = await Constat.find({ userId });

    // Si des constats existent, supprimer les accidents associés
    if (constats.length > 0) {
      // Extraire les accidentId des constats
      const accidentIds = constats.map((constat) => constat.accidentId);

      // Supprimer tous les accidents en une seule requête
      await Accident.deleteMany({ accidentId: { $in: accidentIds } });

      // Supprimer tous les constats en une seule requête
      await Constat.deleteMany({ userId });
      await Fraud.deleteMany({ userId });
    }

    // Supprimer l'assuré
    await User.findByIdAndDelete(userId);

    return {
      message: "Assuré et données associées supprimées avec succès",
    };
  } catch (error) {
    // Propager l'erreur pour une gestion appropriée par l'appelant
    throw new Error(`Erreur lors de la suppression : ${error.message}`);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getUserByCin,
  addUser,
  updateUser,
  addVehiculeToUser,
  getUsersForSidebar,
  getCurrentUser,
  deleteUser,
};
