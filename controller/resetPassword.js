const userModel = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

async function resetPassword(req, res) {
  try {
    const { email } = req.body;
    const caracteres =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let resultat = "";
    if (!email) {
      throw new Error("Please provide email");
    }

    const findUser = await userModel.findOne({ email });
    if (!findUser) {
      throw new Error("User not found");
    }

    const longueur = Math.floor(Math.random() * (8 - 8 + 1)) + 8;
    for (let i = 0; i < longueur; i++) {
      const indexAleatoire = Math.floor(Math.random() * caracteres.length);
      resultat += caracteres[indexAleatoire];
    }
    let password = resultat;
    const salt = bcrypt.genSaltSync(10);
    const hashPassword = await bcrypt.hashSync(password, salt);

    const emailResult = await sendToUserMail(
      findUser?.email,
      "Réinitialiser le mot de passe",

      `
          <h2>Réinitialiser le mot de passe... !</h2>
          <p>Votre mot de passe a été modifié comme suit: <strong>${password}</strong></p>
          <p>Vous pouvez désormais l'utiliser pour vous connecter à l'application. </p>
          <p>Merci de votre participation et espérons mériter votre confiance.</p>
       
          <p>Cordialement,</p>
        
        `
    );

    // Vérifiez si l'email a été envoyé avec succès
    if (!emailResult.success) {
      console.error("Erreur lors de l'envoi de l'email: ", emailResult.error);
      return res.status(500).send("Erreur lors de l'envoi de l'email");
    } else {
      await userModel.findByIdAndUpdate(
        { _id: findUser?._id },
        { password: hashPassword }
      );
      console.log("envoi de l'email à : ", emailResult?.response);
    }

    res.status(201).json({
      data: findUser,
      success: true,
      error: false,
      message: "Password reset Successfully!",
    });
  } catch (err) {
    res.status(400).json({
      message: err.message || err,
      error: true,
      success: false,
    });
  }
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

module.exports = resetPassword;
