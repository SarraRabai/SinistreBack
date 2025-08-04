const Admin = require("../models/Admin");
let bcrypt = require("bcrypt");
const message = require("../models/message");

const getCurrentAdmin = async (req, res) => {
  try {
    let findAdmin = await Admin.findById({ _id: req.admin.adminId });
    if (!findAdmin) return res.status(400).json({ error: "Invalid token" });
    res.status(200).json({ data: findAdmin });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const AjouterGestionnaire = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    let findExpert = await Admin.findOne({ email });

    if (findExpert)
      return res.status(400).json({ message: "Gestionnaire deja existe" });
    let passwordHash = await bcrypt.hash(password, 10);

    let newAdmin = new Admin({
      name,
      email,
      password: passwordHash,
      role: "gestionnaire",
    });
    await newAdmin.save();

    res.status(200).json({
      message: "Expert ajouter avec succe",
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const getAllGestionnaire = async (req, res) => {
  try {
    let findGestionnaire = await Admin.find({ role: "gestionnaire" });

    res.status(200).json({
      result: findGestionnaire,
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const findGestionnaire = async (req, res) => {
  try {
    let findAdmin = await Admin.findOne({ role: "gestionnaire" }).select("_id");
    res.status(200).json({ result: findAdmin, succes: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const AjouterExpert = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    let findExpert = await Admin.findOne({ email });

    if (findExpert)
      return res.status(400).json({ message: "Expert deja existe" });
    let passwordHash = await bcrypt.hash(password, 10);

    let newAdmin = new Admin({
      name,
      email,
      password: passwordHash,
      role: "expert",
    });
    await newAdmin.save();

    res.status(200).json({
      message: "Expert ajouter avec succe",
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const getAllExpert = async (req, res) => {
  try {
    let findExpert = await Admin.find({ role: "expert" });

    res.status(200).json({
      result: findExpert,
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const AjouterGrage = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    let findExpert = await Admin.findOne({ email });

    if (findExpert)
      return res.status(400).json({ message: "grage deja existe" });
    let passwordHash = await bcrypt.hash(password, 10);

    let newAdmin = new Admin({
      name,
      email,
      password: passwordHash,
      role: "grage",
    });
    await newAdmin.save();

    res.status(200).json({
      message: "grage ajouter avec succe",
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const getAllGrage = async (req, res) => {
  try {
    let findExpert = await Admin.find({ role: "grage" });

    res.status(200).json({
      result: findExpert,
      succes: true,
      error: false,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const getListAdminSidBar = async (req, res) => {
  try {
    const findAdmin = await Admin.find({ role: { $ne: "Admin" } }).select(
      "name role"
    );

    res.status(200).json({ result: findAdmin, succes: true, error: false });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message, succes: false, error: true });
  }
};

const modifierByRol = async (req, res) => {
  try {
    const { name, email, password, id } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }
    // Find the Admin by ID
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Prepare update data
    const updateData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
    };

    // Update password only if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    // Update Admin in the database
    const updatedAdmin = await Admin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      message: `${updatedAdmin.role} updated successfully`,
    });
  } catch (error) {
    return res.status(500).json({ message: " error" });
  }
};

const deleteRole = async (req, res) => {
  try {
    let { id } = req.body;

    let admin = await Admin.findByIdAndDelete({ _id: id });

    res.status(200).json({
      message: `${admin.role} deleted successfully`,
    });
  } catch (error) {
    return res.status(500).json({ message: " error" });
  }
};

module.exports = {
  getCurrentAdmin,
  AjouterGestionnaire,
  AjouterExpert,
  AjouterGrage,
  getAllGestionnaire,
  getAllExpert,
  getAllGrage,
  findGestionnaire,
  getListAdminSidBar,
  modifierByRol,
  deleteRole,
};
