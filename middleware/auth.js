const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/Admin");


module.exports = async (req, res, next) => {
  const token = req.header("x-auth-token");
  if (!token)
    return res.status(401).send({ error: "Access denied. No token provided." });

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET 
    );

    if (!payload) {
      return res.status(401).send({ error: "Unauthorized. Invalid token." });
    }

    // Détection et chargement de l'utilisateur ou de l'admin
    if (payload.userId) {
      const user = await User.findById(payload.userId).select("-password");
      if (!user) return res.status(401).send({ error: "User not found" });

      req.user = {
        _id: user._id,
        userId: user._id,
        name: user.name,
        prenom: user.prenom,
        cin: user.cin,
        numeroTelephone: user.numeroTelephone,
        numeroPermis: user.numeroPermis,
        dateDelivrance: user.dateDelivrance,
        dateExpiration: user.dateExpiration,
        categoriesPermis: user.categoriesPermis,
        vehicules: user.vehicules,
        role: "user",
      };
    } else if (payload.adminId) {
      const admin = await Admin.findById(payload.adminId).select("-password");
      if (!admin) return res.status(401).send({ error: "Admin not found" });

      req.admin = {
        _id: admin._id,
        adminId: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin?.role,
      };
    } else {
      return res.status(401).send({ error: "Invalid token payload" });
    }

    next();
  } catch (err) {
    console.log(err);
    res.status(400).send({ error: "Invalid token." });
  }
};
