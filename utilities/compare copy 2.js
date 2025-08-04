const { spawn } = require("child_process");
const path = require("path");

function compareImages(data) {
  return new Promise((resolve, reject) => {
    const venvPython = path.join(__dirname, "../.venv/Scripts/python.exe"); // path to venv python
    const scriptPath = path.join(__dirname, "../fraud.py");

    const pythonProcess = spawn(
      venvPython,
      [scriptPath, JSON.stringify(data)],
      {
        env: {
          ...process.env,
          TF_CPP_MIN_LOG_LEVEL: "3",
          TF_ENABLE_ONEDNN_OPTS: "0",
        },
      }
    );

    let stdoutData = "";
    let stderrData = "";
    pythonProcess.stderr.on("data", (data) => {
      const message = data.toString();
      if (!message.includes("UserWarning")) {
        stderrData += message;
      } else {
        console.warn("⚠️ Avertissement ignoré (Python) :", message.trim());
      }
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
