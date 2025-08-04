const express = require("express");
const router = express.Router();
const constatStore = require("../controller/constatController");
const validateWith = require("../middleware/validation");
const constatSchema = require("../schemas/constatSchema");
const Accident = require("../models/Accident");
const auth = require("../middleware/auth");
const ConstatModel = require("../models/Constat");
const nodemailer = require("nodemailer");
const Constat = require("../models/Constat");
const fs = require("fs");

const Fraud = require("../models/Fraud");

const User = require("../models/User");
const path = require("path");
const compareImages = require("../utilities/compare");

// Ajouter une route pour initialiser un accident
router.post("/accident_init", async (req, res) => {
  try {
    const { accidentId, totalVehicles } = req.body;

    const existingAccident = await Accident.findOne({ accidentId });
    if (existingAccident) {
      return res.status(400).json({ message: "Cet accident existe déjà" });
    }
    const newAccident = new Accident({
      accidentId,
      totalVehicles,
      submittedVehicles: 0,
    });
    await newAccident.save();
    res.status(201).json({ message: "Accident initialisé avec succès" });
  } catch (error) {
    console.error("Erreur lors de l’initialisation de l’accident :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de l’initialisation de l’accident" });
  }
});

// Ajouter un constat
router.post(
  "/addConstat",
  auth,
  validateWith(constatSchema),
  async (req, res) => {
    try {
      // Validation manuelle
      if (!req.body.accidentId) {
        return res.status(400).json({
          error: "Validation failed",
          details: {
            missingFields: ["accidentId"],
            receivedData: req.body,
          },
        });
      }

      const userId = req.user._id;

      let findUser = await User.findById({ _id: req.user._id });

      // Récupérer anciens constats du même utilisateur
      const anciensConstats = await Constat.find({
        userId,
        vehicleRegistration: req.body.vehicleRegistration,
        face: req.body.face,
      });

      const newConstat = await constatStore.addConstat(req.body);

      const accident = await Accident.findOne({
        accidentId: newConstat.accidentId,
      });
      if (accident) {
        const newAccident = await Accident.findOneAndUpdate(
          { accidentId: newConstat.accidentId },
          {
            submittedVehicles: +1,
          }
        );

        if (newAccident.submittedVehicles === accident.totalVehicles) {
          console.log("ok");
          await Accident.findByIdAndUpdate(
            { _id: accident._id },
            {
              isComplete: true,
            }
          );
        }
      }

      newConstat.userId = userId;
      await newConstat.save();

      const emailResult = await sendToUserMail(
        findUser?.email,
        "Nouvelle Constat",

        `<h2>Nouvelle Constat... !</h2>
              <h1>Bonjour ${findUser.prenom} ${findUser.name},</h1>

                      <p>Nous vous informons qu'une <strong>nouvelle constat</strong> a été ajoutée à votre dossier.</p>

                      <h3>Détails du véhicule :</h3>
                      <p><strong>Numéro du véhicule :</strong> ${newConstat.vehicleRegistration}</p>
                       <p><strong>Face du choc :</strong> ${newConstat.face}</p>
                      <h3>Informations du conducteur :</h3>
                      <p><strong>Nom :</strong> ${newConstat.driverFirstName}</p>
                      <p><strong>Prénom :</strong> ${newConstat.driverLastName}</p>
                      <p><strong>N° Permis :</strong> ${newConstat.driverLicenseNumber}</p>
                      <p>Vous pouvez consulter cette constat dès maintenant en vous connectant à votre espace personnel.</p>

                      <p>Cordialement,</p>`
      );

      // Vérifiez si l'email a été envoyé avec succès
      if (!emailResult.success) {
        console.error("Erreur lors de l'envoi de l'email: ", emailResult.error);
      } else {
        console.log("envoi de l'email à : ", emailResult?.response);
      }

      let oldImages = [];

      if (anciensConstats.length > 0) {
        try {
          for (let i = 0; i < anciensConstats.length; i++) {
            oldImages.push(
              getImagesByFace(anciensConstats[i].face, anciensConstats[i])
            );
          }
          const newImages = getImagesByFace(newConstat.face, newConstat);

          const result = await compareImages({ oldImages, newImages });

          if (result?.fraud) {
            const newFraud = new Fraud({
              userId,
              nvConstat: newConstat._id,
              ancienConstat: anciensConstats._id,
              similarity: result?.total_similarity.toFixed(2),
              imagesCompared: result?.result_image,
              createdAt: new Date(),
            });
            await newFraud.save();
          }
        } catch (error) {
          console.log(error);
        }
      }

      res.status(201).json({
        message: "Constat enregistré avec succès",
        constat: newConstat,
        completed: `${accident.submittedVehicles}/${accident.totalVehicles}`,
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement du constat :", error);
      res
        .status(500)
        .json({ message: "Erreur lors de l'enregistrement du constat" });
    }
  }
);

// Récupérer un constat par ID
router.get("/:id", async (req, res) => {
  try {
    const constat = await constatStore.getConstatById(req.params.id);
    if (!constat) {
      return res.status(404).json({ message: "Constat non trouvé" });
    }
    res.status(200).json(constat);
  } catch (error) {
    console.error("Erreur lors de la récupération du constat :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du constat" });
  }
});

// Récupérer tous les constats
router.get("/", async (req, res) => {
  try {
    const constats = await constatStore.getAllConstats();
    res.status(200).json(constats);
  } catch (error) {
    console.error("Erreur lors de la récupération des constats :", error);
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération des constats" });
  }
});

//getAll constat by user

router.post("/constatByUser", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const getAllConstats = await ConstatModel.find({ userId });
    res.status(201).json({ result: getAllConstats });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Erreur lors de la récupération du constat" });
  }
});

router.post("/getConstatUser", async (req, res) => {
  try {
    const { userId } = req.body;

    let findConstat = await ConstatModel.find({ userId: userId }).populate(
      "userId",
      "name prenom"
    );

    res.status(200).json({
      result: findConstat,
      succes: true,
      error: false,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la récupération du constat",
      succes: false,
      error: true,
    });
  }
});

router.get("/getConstat/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const constat = await Constat.findById(id);

    if (!constat) {
      return res.status(404).json({ message: "Constat non trouvé" });
    }

    res.json({
      constat,
      nouveauxImages: getImagesByFace(constat.face, constat),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

function getImagesByFace(face, constat) {
  const images = {};

  if (face.includes("avant")) {
    images.frontImage = constat.frontImage;
  }
  if (face.includes("arrière")) {
    images.backImage = constat.backImage;
  }
  if (face.includes("gauche")) {
    images.leftImage = constat.leftImage;
  }
  if (face.includes("droite")) {
    images.rightImage = constat.rightImage;
  }
  if (face === "tous") {
    images.frontImage = constat.frontImage;
    images.backImage = constat.backImage;
    images.leftImage = constat.leftImage;
    images.rightImage = constat.rightImage;
  }

  return images;
}

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
