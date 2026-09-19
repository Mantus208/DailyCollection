const XLSX = require("xlsx");

// Uploaded Excel/CSV buffer ko row-objects ke array me convert karta hai
const parseExcelBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
};

// Ek row me kisi column ki value dhoondhta hai, chahe header me thoda spelling
// farak ho (jaise "Sub. No." vs "Sub.No.")
const getField = (row, ...candidates) => {
  for (const key of Object.keys(row)) {
    const normalized = key.replace(/\s|\./g, "").toLowerCase();
    for (const candidate of candidates) {
      if (normalized === candidate.replace(/\s|\./g, "").toLowerCase()) {
        return row[key];
      }
    }
  }
  return null;
};

// Numeric ID (jaise 873563.0) ya string ko clean string me convert karta hai
const toIdString = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

module.exports = { parseExcelBuffer, getField, toIdString };
