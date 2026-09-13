import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDirectory = path.join(__dirname, "dist");
const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(express.static(distDirectory));

app.use((request, response) => {
  response.sendFile(path.join(distDirectory, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SDFC dashboard listening on port ${PORT}`);
});
