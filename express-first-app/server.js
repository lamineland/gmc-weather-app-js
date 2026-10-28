const path = require("path");
const express = require("express");
const workingHours = require("./middleware/workingHours");

const app = express();
const PORT = process.env.PORT || 3000;

const PAGES_DIR = path.join(__dirname, "public", "pages");

// Static assets (CSS) - served after the middleware so the time gate applies
app.use(express.static(path.join(__dirname, "public")));

// Custom middleware: the app is only available Mon-Fri, 9:00-17:00
app.use(workingHours);

// Routes
app.get("/", (req, res) => {
  res.sendFile("home.html", { root: PAGES_DIR });
});

app.get("/services", (req, res) => {
  res.sendFile("services.html", { root: PAGES_DIR });
});

app.get("/contact", (req, res) => {
  res.sendFile("contact.html", { root: PAGES_DIR });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send("<h1>404 - Page not found</h1><p><a href='/'>Back to Home</a></p>");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Available Mon-Fri, 9:00-17:00");
});
