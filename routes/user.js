const express = require("express");
const router = express.Router();
const usersStore = require("../controller/users");
const resetPassword = require("../controller/resetPassword");
//const auth = require("../middleware/auth");

// Route pour obtenir les informations d'un utilisateur par ID
//auth,
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  // Trouver l'utilisateur par ID
  const user = await usersStore.getUserById(userId);
  if (!user) {
    return res.status(404).send({ error: "Utilisateur non trouvé." });
  }

  // Renvoyer les informations de l'utilisateur
  res.send({
    id: user._id,
    name: user.name,
    cin: user.cin,
    vehicules: user.vehicules,
  });
});

router.post("/resetpassword", resetPassword);

module.exports = router;
