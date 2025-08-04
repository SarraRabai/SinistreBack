const express = require("express");
const router = express.Router();
const Joi = require("joi");
const usersStore = require("../controller/users");
const validateWith = require("../middleware/validation");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

//const auth = require("../middleware/auth");
const {
  addVehiculeToUser,
  getUsersForSidebar,
  getCurrentUser,
} = require("../controller/users");
const auth = require("../middleware/auth");
const User = require("../models/User");
const nodemailer = require("nodemailer");
// Schéma de validation pour un véhicule
const vehiculeSchema = {
  vehicules: Joi.array()
    .items(
      Joi.object({
        brand: Joi.string().required(),
        numeroSerie: Joi.string().required(),
        numeroMatricule: Joi.string().required(),
        type: Joi.string().required(),
        numeroContrat: Joi.string().required(),
        assure: Joi.string().required(),
        agence: Joi.string().required(),
        insuranceStartDate: Joi.date().required(),
        insuranceEndDate: Joi.date().required(),
      })
    )
    .required(), // Le champ "vehicles" est obligatoire
};

// Schéma de validation pour l'utilisateur
const userSchema = {
  name: Joi.string().required().min(2),
  prenom: Joi.string().required(),
  cin: Joi.string().required(),

  email: Joi.string().required(),
  numeroTelephone: Joi.string().required(),
  adresse: Joi.string().required(),
  numeroPermis: Joi.string().required(),
  dateDelivrance: Joi.date().required(),
  dateExpiration: Joi.date().required(),
  categoriesPermis: Joi.array().required(),
  vehicules: Joi.array()
    .items(
      Joi.object({
        brand: Joi.string().required(),
        numeroSerie: Joi.string().required(),
        numeroMatricule: Joi.string().required(),
        type: Joi.string().required(),
        numeroContrat: Joi.string().required(),
        assure: Joi.string().required(),
        agence: Joi.string().required(),
        insuranceStartDate: Joi.date().required(),
        insuranceEndDate: Joi.date().required(),
      })
    )
    .required(), // Le champ "vehicles" est obligatoire
};

// Route pour créer un utilisateur
router.post("/addUser", validateWith(userSchema), async (req, res) => {
  const {
    name,
    prenom,
    cin,

    email,
    numeroTelephone,
    adresse,
    numeroPermis,
    dateDelivrance,
    dateExpiration,
    categoriesPermis,
    vehicules,
  } = req.body;

  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await usersStore.getUserByCin(cin);
    if (existingUser) {
      return res
        .status(400)
        .send({ message: "Un utilisateur avec ce CIN existe déjà." });
    }

    const caracteres =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let resultat = "";

    const longueur = Math.floor(Math.random() * (8 - 8 + 1)) + 8;
    for (let i = 0; i < longueur; i++) {
      const indexAleatoire = Math.floor(Math.random() * caracteres.length);
      resultat += caracteres[indexAleatoire];
    }
    let password = resultat;
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = await bcrypt.hashSync(password, salt);

    // Ajouter l'utilisateur
    const user = {
      name,
      prenom,
      cin,
      password: hashPassword,
      email,
      numeroTelephone,
      adresse,
      numeroPermis,
      dateDelivrance,
      dateExpiration,
      categoriesPermis,
      vehicules,
    };
    const newUser = await usersStore.addUser(user);

    const emailResult = await sendToUserMail(
      email,
      "Bienvenue sur notre application – Vos identifiants de connexion",

      `
        <h2>Bienvenue sur notre application !</h2>
        <h1>Bonjour ${newUser.prenom} ${newUser.name},</h1>
        <p>Nous sommes ravis de vous compter parmi nos utilisateurs.</p>
        <p>Votre compte a été créé avec succès. Voici vos identifiants de connexion :</p>
        <ul>
          <li><strong>CIN :</strong> ${newUser.cin}</li>
          <li><strong>Mot de passe :</strong> ${password}</li>
        </ul>
         
          <p>Vous pouvez dès maintenant vous connecter à l'application et accéder à votre espace personnel.</p>
        <p>Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe après votre première connexion.</p>
      
      
        <p>Cordialement,</p>
       
  
        
        `
    );

    // Vérifiez si l'email a été envoyé avec succès
    if (!emailResult.success) {
      console.error("Erreur lors de l'envoi de l'email: ", emailResult.error);
    } else {
      console.log("envoi de l'email à : ", emailResult?.response);
    }

    res.status(201).json({
      newuser: newUser,
      succes: true,
      error: false,
      message: "user Ajouter avec succès",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
      succes: false,
      error: true,
    });
  }
});

// Route pour obtenir tous les utilisateurs
router.get("/", async (req, res) => {
  const users = await usersStore.getUsers();
  res.send(users);
});

router.post("/deleteUser", async (req, res) => {
  try {
    let { idUser } = req.body;
    const result = await usersStore.deleteUser(idUser);

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour ajouter un véhicule à un utilisateur
router.post("/:userId/vehicules", async (req, res) => {
  const { userId } = req.params;
  const { registration, insuranceStartDate, insuranceEndDate } = req.body;

  try {
    const vehicule = {
      brand,
      registration,
      insuranceStartDate,
      insuranceEndDate,
    };

    const updatedUser = await addVehiculeToUser(userId, vehicule);
    res.status(201).send(updatedUser);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Route pour obtenir les véhicules d'un utilisateur
//auth,
router.get("/:userId/vehicules", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await usersStore.getUserById(userId);
    if (!user) {
      return res.status(404).send({ error: "Utilisateur non trouvé." });
    }

    res.send(user.vehicules);
  } catch (error) {
    res
      .status(500)
      .send({ error: "Erreur lors de la récupération des véhicules." });
  }
});

router.get("/", auth, getUsersForSidebar);

router.get("/currentUser", auth, getCurrentUser);

router.get("/getAllVehicule", auth, async (req, res) => {
  try {
    let findUser = await User.findById({ _id: req.user?._id });

    res.status(201).send({ result: findUser?.vehicules });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", error });
  }
});

router.post("/getAllVehicule", async (req, res) => {
  try {
    const { userId } = req.body;
    let findUser = await User.findById({ _id: userId });

    res.status(201).send({ result: findUser?.vehicules });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", error });
  }
});

//add vehicule to assuré
router.post("/addvehicule", async (req, res) => {
  try {
    const { vehicules, userId } = req.body;

    let findUser = await User.findById({ _id: userId });

    findUser.vehicules.push(vehicules);
    await findUser.save();

    res.status(200).json({ result: findUser.vehicules });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", error });
  }
});

router.post("/deleteVehicule", async (req, res) => {
  try {
    const { vehiculeId, userId } = req.body;

    if (!vehiculeId) {
      return res.status(400).json({ message: "vehiculeId manquant" });
    }

    const result = await User.updateOne(
      { _id: userId },
      { $pull: { vehicules: { _id: vehiculeId } } },
      { new: true }
    );

    res
      .status(200)
      .json({ message: "Vehicle deleted successfully", result: result });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la suppression", error });
  }
});

router.post("/updateVehicule", async (req, res) => {
  try {
    const {
      vehiculeId,
      userId,
      brand,
      numeroSerie,
      numeroMatricule,
      type,
      numeroContrat,
      assure,
      agence,
      insuranceStartDate,
      insuranceEndDate,
    } = req.body;

    // Validate required fields
    if (!vehiculeId || !userId) {
      return res
        .status(400)
        .json({ error: "vehiculeId and userId are required" });
    }

    // Update vehicle in user's vehicules array
    const user = await User.findOneAndUpdate(
      { _id: userId, "vehicules._id": vehiculeId },
      {
        $set: {
          "vehicules.$": {
            _id: vehiculeId,
            brand,
            numeroSerie,
            numeroMatricule,
            type,
            numeroContrat,
            assure,
            agence,
            insuranceStartDate,
            insuranceEndDate,
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "Vehicle or user not found" });
    }

    res.status(200).json({ message: "Vehicle updated successfully" });
  } catch (error) {
    console.error("Error updating vehicle:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/allUsers", getUsersForSidebar);

const sendToUserMail = async (to, subject, text) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.mail,
      pass: process.env.password, // Assurez-vous d'utiliser un mot de passe d'application ici
    },
  });

  let mailOptions = {
    from: process.env.mail,
    to,
    subject,
    html: text,
  };

  try {
    // Envoyer l'email
    let info = await transporter.sendMail(mailOptions);

    return { success: true, response: info.response }; // Retourner le succès
  } catch (error) {
    return { success: false, error: error }; // Retourner l'erreur
  }
};

module.exports = router;
