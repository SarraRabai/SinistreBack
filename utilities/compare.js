const { spawn } = require("child_process");
const path = require("path");

module.exports = function compareImages(data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "fraud.py");
    const jsonString = JSON.stringify(data);

    const pythonProcess = spawn("python", [scriptPath, jsonString]);

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      const warning = data.toString();
      if (!warning.toLowerCase().includes("warning")) {
        stderrData += warning;
      }
    });

    pythonProcess.on("close", () => {
      if (stderrData) {
        console.error("❌ Erreur Python :", stderrData);
        return reject(new Error(stderrData));
      }

      try {
        // 🔍 Log du contenu brut venant de Python
        console.log("📦 Données brutes de Python :", stdoutData.trim());

        const result = JSON.parse(stdoutData.trim());
        resolve(result);
      } catch (err) {
        reject(
          new Error(`❌ JSON invalide retourné par Python : ${stdoutData}`)
        );
      }
    });
  });
};
