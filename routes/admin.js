const express = require("express");
const auth = require("../middleware/auth");
const {
  getCurrentAdmin,
  AjouterExpert,
  AjouterGrage,
  getAllExpert,
  getAllGrage,
  findGestionnaire,
  getListAdminSidBar,
  getAllGestionnaire,
  AjouterGestionnaire,
  modifierByRol,
  deleteRole,
} = require("../controller/admin");
const router = express.Router();

router.get("/currentAdmin", auth, getCurrentAdmin);
router.get("/findGestionnaire", findGestionnaire);

router.post("/AjouterGestionnaire", AjouterGestionnaire);
router.get("/getGestionnaire", getAllGestionnaire);

router.post("/AjouterExpert", AjouterExpert);
router.get("/getExpert", getAllExpert);
router.post("/AjouterGrage", AjouterGrage);
router.get("/getgrage", getAllGrage);
router.get("/getListAdminSidBar", getListAdminSidBar);
router.post("/modifierByRol", modifierByRol);
router.post("/deleteRole", deleteRole);
module.exports = router;
