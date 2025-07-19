const { spawn } = require('child_process');
const path = require('path');

module.exports = async (texto, rutaSalida) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'habla_peron.py'); // Ajustá esto si está en otro lado
    console.log("Ejecutando:", `python ${scriptPath} "${texto}" "${rutaSalida}"`);

    const process = spawn('python', [scriptPath, texto, rutaSalida]);

    process.stdout.on('data', data => console.log("[stdout]", data.toString()));
    process.stderr.on('data', data => console.error("[stderr]", data.toString()));

    process.on('close', code => {
      if (code === 0) {
        console.log("✅ Audio generado correctamente");
        resolve();
      } else {
        reject(new Error(`❌ Error al generar audio con código ${code}`));
      }
    });
  });
};
