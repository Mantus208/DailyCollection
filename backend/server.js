require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const areaRoutes = require("./routes/areaRoutes");
const userRoutes = require("./routes/userRoutes");
const importRoutes = require("./routes/importRoutes");
const consumerRoutes = require("./routes/consumerRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const reportRoutes = require("./routes/reportRoutes");
const franchiseeRoutes = require("./routes/franchiseeRoutes");
const activityLogRoutes = require("./routes/activityLogRoutes");
const stockRoutes = require("./routes/stockRoutes");

connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Daily Collection App API is running");
});

app.use("/api/auth", authRoutes);
app.use("/api/areas", areaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/import", importRoutes);
app.use("/api/consumers", consumerRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/franchisees", franchiseeRoutes);
app.use("/api/activity-log", activityLogRoutes);
app.use("/api/stock", stockRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
