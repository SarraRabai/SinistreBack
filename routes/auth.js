const express = require("express");
const router = express.Router();
//const Joi = require("joi");
const usersStore = require("../controller/users.js");
const validateWith = require("../middleware/validation");
const jwt = require("jsonwebtoken");
const userSchema = require("../models/User.js");
const bcrypt = require("bcrypt");
const Admin = require("../models/Admin.js");

/*const schema = Joi.object({
  cin: Joi.string().required(),
  password: Joi.string().required().min(5),
});
*/
router.post("/", validateWith(userSchema), async (req, res) => {
  const { cin, password } = req.body;

  try {
    // Trouver l'utilisateur par CIN
    const user = await usersStore.getUserByCin(cin);
    if (!user) {
      return res.status(400).send({ error: "CIN invalide." });
    }

    let compare = await bcrypt.compare(password, user?.password);
    if (!compare)
      return res.status(400).send({ error: "mot de passe invalide." });

    const tokenData = {
      userId: user._id,
      name: user.name,
      prenom: user?.prenom,
      cin,
      numeroTelephone: user?.numeroTelephone,
      adresse: user?.adresse,
      numeroPermis: user?.numeroPermis,
      dateDelivrance: user?.dateDelivrance,
      dateExpiration: user?.dateExpiration,
      categoriesPermis: user?.categoriesPermis,
      vehicules: user?.vehicules,
    };
    // Générer un token JWT
    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET || "jwtPrivateKey" // Clé secrète pour signer le token
    );

    res.json({
      ok: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          cin: user.cin,
          vehicules: user?.vehicules,
        },
      },
    });
  } catch (error) {
    console.error("Erreur lors de la génération du token:", error);
    res
      .status(500)
      .send({ error: "Une erreur s'est produite lors de la connexion." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    let findAdmin = await Admin.findOne({ email });
    if (!findAdmin) return res.status(400).send({ error: "email invalide." });

    let compare = await bcrypt.compare(password, findAdmin?.password);
    if (!compare)
      return res.status(400).send({ error: "mot de passe invalide." });

    const tokenData = {
      adminId: findAdmin._id,
      name: findAdmin.name,
      email: findAdmin.email,
      role: findAdmin?.role,
    };
    // Générer un token JWT
    const token = jwt.sign(
      tokenData,
      process.env.JWT_SECRET  // Clé secrète pour signer le token
    );

    res.json({
      ok: true,
      data: {
        token,
        admin: findAdmin,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la génération du token:", error);
    res
      .status(500)
      .send({ error: "Une erreur s'est produite lors de la connexion." });
  }
});

module.exports = router;
