let route = require("express").Router();

let fraudCtrl = require("../controller/FraudCtrl");

route.get("/fraud", fraudCtrl.getAllFraud);

route.post("/fraud", fraudCtrl.getfraudById);

module.exports = route;
