const getCurrentMonth = () => new Date().toISOString().slice(0, 7); // "2026-09"

module.exports = { getCurrentMonth };
