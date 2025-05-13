require("dotenv").config();
const { processQueue } = require("./queue");

console.log("Queue processor started...");

setInterval(() => {
  console.log("Checking for pending jobs...");
  processQueue().catch((err) => {
    console.error("Error processing queue:", err);
  });
}, 5000);
