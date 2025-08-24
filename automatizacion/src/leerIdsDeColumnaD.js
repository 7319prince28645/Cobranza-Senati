const { google } = require("googleapis");
const credentials = require("./credentials.json");

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function LeerTodasLasHojas() {
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const spreadsheetId = "1881w82eHzfGjW18wtjTwTZo6hUDGeOdu6r1lxnExpqk";

  try {
    // 1. Obtener metadata para saber títulos de las hojas
    const sheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = sheetMeta.data.sheets.map(sheet => sheet.properties.title);

    // 2. Construir todas las ranges
    const ranges = sheetTitles.map(title => `${title}!D5:D`);

    // 3. Hacer UNA SOLA llamada a batchGet
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    const resultados = {};
    res.data.valueRanges.forEach((rangeObj, idx) => {
      const title = sheetTitles[idx];
      const valores = rangeObj.values || [];
      resultados[title] = valores.map(row => row[0]);
    });

    return resultados;
  } catch (error) {
    console.error("Error al leer las hojas del spreadsheet:", error);
    throw error;
  }
}

module.exports = LeerTodasLasHojas;
