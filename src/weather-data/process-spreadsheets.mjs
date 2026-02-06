import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import xlsx from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DOWNLOAD: spreadsheet from open-meteo
// https://open-meteo.com/en/docs/historical-weather-api?start_date=2025-02-06&end_date=2026-02-05&latitude=99.9999&longitude=-99.999&timezone=America%2FNew_York&daily=sunshine_duration,daylight_duration,sunset,sunrise&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&hourly=

// REFORMAT: spreadsheet to use these rows
// | time | sunshine_duration | daylight_duration | sunset | sunrise |
const INPUT_DIR = path.resolve(__dirname, "./spreadsheets");
const OUTPUT_DIR = path.join(__dirname);

function serialToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  return new Date(Math.round((serial - 25569) * 86400 * 1000));
}

function parseTimeToDecimal(serialValue) {
  const jsDate = serialToDate(serialValue);
  if (!jsDate) return 0;

  const hours = jsDate.getUTCHours();
  const minutes = jsDate.getUTCMinutes();
  return parseFloat((hours + minutes / 60).toFixed(2));
}

function formatDate(serialValue) {
  const jsDate = serialToDate(serialValue);
  if (!jsDate) return "N/A";
  return jsDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
}
async function processSpreadsheets() {
  const files = fs.readdirSync(INPUT_DIR).filter((file) => file.endsWith(".xlsx"));

  for (const file of files) {
    const result = [];

    const workbook = xlsx.readFile(path.join(INPUT_DIR, file));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { raw: true });
    console.log("🚀 ~ processSpreadsheets ~ rows:", rows);

    for (const row of rows) {
      if (row.time && row.sunset && row.sunrise) {
        result.push({
          date: formatDate(row.time),
          sunset: parseTimeToDecimal(row.sunset),
          sunrise: parseTimeToDecimal(row.sunrise),
          sunshine_duration_hrs: parseFloat((row.sunshine_duration / 3600).toFixed(2)),
          daylight_duration_hrs: parseFloat((row.daylight_duration / 3600).toFixed(2)),
        });
      }
    }

    const outputFileName = file.replace(".xlsx", ".json");
    fs.writeFileSync(path.join(OUTPUT_DIR, outputFileName), JSON.stringify(result, null, 2));

    console.log(`✅ Processed ${file} -> ${outputFileName} (${result.length} days)`);
  }
}

processSpreadsheets().catch(console.error);
