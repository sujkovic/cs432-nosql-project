const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");

mongoose
  .connect("mongodb://localhost/my_database", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to database!");
  })
  .catch((error) => {
    console.log("Error connecting to database: ", error);
  });

const app = express();

// View Engine
app.set("view engine", "ejs");
app.set("views", "./views");

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// Server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
