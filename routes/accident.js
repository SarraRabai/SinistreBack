let accident = require("../models/Accident");
let constats = require("../models/Constat");
let router = require("express").Router();

router.get("/accident", async (req, res) => {
  try {
    let findAccidents = await accident.find();

    res.status(200).json({ result: findAccidents });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/getConstatByAccident", async (req, res) => {
  try {
    let { accidentId } = req.body;

    let findConstat = await constats
      .find({ accidentId })
      .populate("userId", "name prenom cin numeroTelephone numeroPermis email");

    res.status(200).json({ result: findConstat });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
