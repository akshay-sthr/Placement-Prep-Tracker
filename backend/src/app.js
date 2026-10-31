const express = require("express");
const path = require("path");
const routes = require("./api/routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json({ limit: "100kb" }));

app.use(express.static(path.join(__dirname, "..", "..", "frontend")));

app.use("/api", routes);

app.use(errorHandler);

module.exports = app;
