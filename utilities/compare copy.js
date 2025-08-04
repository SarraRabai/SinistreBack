const { spawn } = require("child_process");
const path = require("path");

function compareImages(data) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "../fraud.py");
    const pythonProcess = spawn("python", [scriptPath, JSON.stringify(data)], {
      env: {
        ...process.env,
        TF_CPP_MIN_LOG_LEVEL: "3",
        TF_ENABLE_ONEDNN_OPTS: "0",
      },
    });

    let stdoutData = "";
    let stderrData = "";

    pythonProcess.stdout.on("data", (data) => {
      stdoutData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    pythonProcess.on("close", () => {
      if (stderrData) {
        console.error("❌ Erreur Python :", stderrData);
        return reject(new Error(stderrData));
      }

      try {
        const result = JSON.parse(stdoutData.trim());
        resolve(result);
      } catch (err) {
        reject(
          new Error(`Impossible d’analyser la réponse JSON : ${stdoutData}`)
        );
      }
    });
  });
}

module.exports = compareImages;
