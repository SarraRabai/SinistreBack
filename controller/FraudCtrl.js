let Fraud = require("../models/Fraud");

let fraudCtrl = {
  getAllFraud: async (req, res) => {
    try {
      let findFraud = await Fraud.find()
        .populate("userId", "name prenom numeroTelephone")
        .populate("nvConstat")
        .populate("ancienConstat");
      res.status(200).json({ result: findFraud });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getfraudById: async (req, res) => {
    try {
      let { id } = req.body;
      let findFraud = await Fraud.findById({ _id: id })
        .populate("userId", "name prenom numeroTelephone")
        .populate("nvConstat")
        .populate("ancienConstat");

      if (!findFraud) {
        return res.status(404).json({ error: "Fraud not found" });
      }

      const { imagesCompared, nvConstat, ancienConstat } = findFraud;

      // Fonction pour filtrer les champs nécessaires
      const filterConstat = (constat) => {
        if (!constat) return null;

        const filtered = {
          _id: constat._id,
          vehicleRegistration: constat.vehicleRegistration,
          vehicleBrand: constat.vehicleBrand,
          date: constat.date,
          location: constat.location,
        };

        imagesCompared.forEach((key) => {
          if (constat[key]) {
            filtered[key] = constat[key];
          }
        });

        return filtered;
      };

      findFraud.nvConstat = filterConstat(nvConstat);
      findFraud.ancienConstat = filterConstat(ancienConstat);

      res.status(200).json({ result: findFraud });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

module.exports = fraudCtrl;
