//  Dependencies
const express = require("express");
const mongoose = require("mongoose");
const ejs = require("ejs");
require("dotenv").config();

//  Connect to database
mongoose
  .connect(process.env.mongodb_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const app = express();

// Configure view Engine
app.set("view engine", "ejs");
app.set("views", "./views");

app.use(express.urlencoded({ extended: false }));
app.use(express.static("public"));

//  Schema

const Crime = mongoose.model(
  "Crime",
  new mongoose.Schema({
    number: { type: Number },
    incidentID: { type: Number },
    offenceCode: { type: Number },
    CRNumber: { type: Number },
    dispatchDate: { type: Date },
    NIBRSCode: { type: String },
    victims: { type: Number },
    crimeName1: { type: String },
    crimeName2: { type: String },
    crimeName3: { type: String },
    policeDistrictName: { type: String },
    blockAddress: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: Number },
    agency: { type: String },
    place: { type: String },
    sector: { type: String },
    beat: { type: String },
    PRA: { type: Number },
    addressNumber: { type: Number },
    streetName: { type: String },
    streetType: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    latitude: { type: Number },
    longitude: { type: Number },
    policeDistrictNumber: { type: String },
    location: { type: String },
    year: { type: Number },
    month: { type: Number },
    yearMonth: { type: String },
    day: { type: Number },
    commitedAtMorning: { type: Boolean },
  })
);






/*
const Crime = mongoose.model(
  "Crime",
  new mongoose.Schema({
    CMPLNT_NUM: Number,
    CMPLNT_FR_DT: Date,
    CMPLNT_FR_TM: TimeRanges,
    CMPLNT_TO_DT: Date,
    CMPLNT_TO_TM: Number,
    ADDR_PCT_CD: TimeRanges,
    RPT_DT: Date,
  })
);
*/

// Routes

//  Index

app.get("/", (req, res) => {
  res.render("index");
});

//  Query One

//  vertical 39.7 to 38
//  horizontal one (second one) -75 to -79.5

app.get("/queryOne", (req, res) => {
  let scale = 0.2;
  let crimesMatrix = [];
  let minLatitude = 39.7 - scale;
  let maxLatitude = 39.7;
  let minLongitude = -79.5;
  let maxLongitude = -79.5 + scale;
  while (maxLatitude >= 38) {
    let crimesArray = [];
    while (minLongitude <= -75) {
      let query = Crime.countDocuments({
        $and: [
          {
            latitude: {
              $gte: minLatitude,
              $lte: maxLatitude,
            },
          },
          {
            longitude: {
              $gte: minLongitude,
              $lte: maxLongitude,
            },
          },
        ],
      });
      crimesArray.push(query);
      minLongitude += scale;
      maxLongitude += scale;
    }
    crimesMatrix.push(crimesArray);
    minLongitude = -79.5;
    maxLongitude = -79.5 + scale;
    maxLatitude -= scale;
    minLatitude -= scale;
  }

  // Use Promise.all() to wait for all the Promises to resolve
  Promise.all(crimesMatrix.flat().map((query) => query.exec())).then(
    (results) => {
      // Update the crimesMatrix with the results
      let index = 0;
      crimesMatrix.forEach((crimeArray) => {
        crimeArray.forEach(() => {
          crimeArray[index] = results.shift();
          index++;
        });
        index = 0;
      });
      res.render("queryOne", { crimes: crimesMatrix });
    }
  );
});

//  Query Two

app.get("/queryTwo", (req, res) => {
  res.render("queryTwo");
});

app.post("/queryTwo", (req, res) => {
  Crime.find(
    {
      $expr: {
        $and: [
          { $gte: [{ $hour: "$startDate" }, req.body.timeStart] },
          { $lte: [{ $hour: "$startDate" }, req.body.timeEnd] },
          { $eq: ["$city", req.body.city.toUpperCase()] },
        ],
      },
    },
    (err, crimes) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "server erorr" });
      }
      if (!crimes) {
        return res.status(404).json({ message: "No crimes found :(" });
      }
      //  analyze data
      res.render("queryTwo", { isPost: true, crimesSize: crimes.length });
    }
  );
});

//  Query Three

app.get("/queryThree", (req, res) => {
  res.render("queryThree");
});

app.post("/queryThree", (req, res) => {
  Crime.aggregate([
    {
      $match: {
        city: req.body.city.toUpperCase(),
        startDate: {
          $gte: new Date(`1970-01-01T${req.body.timeStart}:00:00Z`),
          $lte: new Date(`1970-01-01T${req.body.timeEnd}:00:00Z`),
        },
      },
    },
    {
      $group: {
        _id: "$crimeName1",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
    {
      $limit: 1,
    },
  ]).exec((err, crime) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "server erorr" });
    }
    if (!crime) {
      return res.status(404).json({ message: "No crime found :(" });
    }
    //  analyze data
    console.log(crime);
    res.render("queryThree", { isPost: true, crime: crime });
  });
});

// Server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
