const express = require("express");
const mongoose = require("mongoose");
const users = require("./routes/users");
const user = require("./routes/user");
const auth = require("./routes/auth");
const upload = require("./routes/upload");
const addConstat = require("./routes/addConstat");
const message = require("./routes/message");
const helmet = require("helmet");
const compression = require("compression");
const config = require("config");
var bodyParser = require("body-parser");
const path = require("path");
const Admin = require("./models/Admin");
const AdminRoutes = require("./routes/admin");
const FraudRoutes = require("./routes/fraud");
const AccidentRouter = require("./routes/accident");

const bcrypt = require("bcrypt");
// app.use(bodyParser.urlencoded());

const { io, server } = require("./socket/socket");
const cors = require("cors");
const app = express();
server.on("request", app);
// parse application/json
app.use(bodyParser.json({ strict: false }));

app.use(express.json());
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: "*", // Tu peux spécifier ton frontend ici
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-auth-token"],
    credentials: true,
  })
);

// app.use(express.static("/api/uploads/images/"));
// app.use(
//   "/api/uploads/images/",
//   express.static(path.join(__dirname, "/uploads/images/"))
// );

app.use(
  "/api/resultat_constat",
  express.static(path.join(__dirname, "/resultat_constat/"))
);

app.use(
  "/api/uploads/images",
  express.static(path.join(__dirname, "/uploads/images/"))
);

app.use("/api/uploads/images", (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-auth-token");
  next();
});

app.get("/", (req, res) => res.send("hello here !!"));
app.use("/api/user", user);
app.use("/api/users", users);
app.use("/api/admin", AdminRoutes);

app.use("/api/auth", auth);
app.use("/api/upload", upload);
app.use("/api/addConstat", addConstat);
app.use("/api/message", message);
app.use("/api/fraud", FraudRoutes);
app.use("/api/accident", AccidentRouter);

// Configuration de MongoDB

app.use((req, res, next) => {
  res.setTimeout(90000, () => {
    // Timeout de 300 secondes (5 minutes)
    console.log("La requête a expiré");
    res.status(408).send("Request Timeout");
  });
  next();
});

//create admin if not exist

const createAdmin = async () => {
  let findAdmin = await Admin.findOne();
  if (!findAdmin) {
    let passe = "admin@123@";
    let passwordHash = await bcrypt.hash(passe, 10);
    await Admin.create({
      name: "admin",
      email: "admin@gmail.com",
      password: passwordHash,
    });
  }
};

mongoose
  .connect("mongodb://localhost:27017/DataBaseConstat")
  .then(() => {
    console.log("Connecté à MongoDB avec succès");
  })
  .catch((err) => {
    console.error("Erreur de connexion à MongoDB :", err);
    process.exit(1); // Quitter l'application en cas d'échec de connexion
  });

createAdmin();

const port = process.env.PORT || config.get("port");
server.listen(port, function () {
  console.log(`Server started on port ${port}...`);
});

module.exports = { app, server };
