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
    "Incident ID": { type: Number },
    "Offence Code": { type: Number },
    "CR Number": { type: Number },
    "Dispatch Date / Time": { type: Date },
    "NIBRS Code": { type: String },
    "Victims": { type: Number },
    "Crime Name1": { type: String },
    "Crime Name2": { type: String },
    "Crime Name3": { type: String },
    "Police District Name": { type: String },
    "Block Address": { type: String },
    "City": { type: String },  // Note: uppercase C
    "State": { type: String },
    "Zip Code": { type: Number },
    "Agency": { type: String },
    "Place": { type: String },
    "Sector": { type: String },
    "Beat": { type: String },
    "PRA": { type: Number },
    "Address Number": { type: Number },
    "Street Name": { type: String },
    "Street Type": { type: String },
    "Start_Date_Time": { type: Date },
    "End_Date_Time": { type: Date },
    "Latitude": { type: Number },  // Note: uppercase L
    "Longitude": { type: Number }, // Note: uppercase L
    "Police District Number": { type: String },
    "Location": { type: String }
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
            "Latitude": {  // Changed from latitude
              $gte: minLatitude,
              $lte: maxLatitude,
            },
          },
          {
            "Longitude": {  // Changed from longitude
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

app.post("/queryTwo", async (req, res) => {
  try {
    const crimes = await Crime.aggregate([
      {
        $match: {
          "City": req.body.city.toUpperCase()
        }
      },
      {
        $addFields: {
          hour: {
            $let: {
              vars: {
                timePart: { $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 1] },
                hourPart: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 1] }, ":"] }, 0] },
                ampm: { $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 2] }
              },
              in: {
                $cond: {
                  if: { $eq: ["$$ampm", "PM"] },
                  then: { $add: [{ $toInt: "$$hourPart" }, 12] },
                  else: { $toInt: "$$hourPart" }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          hour: {
            $gte: parseInt(req.body.timeStart),
            $lte: parseInt(req.body.timeEnd)
          }
        }
      }
    ]);

    if (!crimes || crimes.length === 0) {
      return res.status(404).json({ message: "No crimes found :(" });
    }

    res.render("queryTwo", { isPost: true, crimesSize: crimes.length });
  } catch (err) {
    console.error("Full error:", err);
    return res.status(500).json({ message: "server error" });
  }
});

//  Query Three

app.get("/queryThree", (req, res) => {
  res.render("queryThree");
});

app.post("/queryThree", async (req, res) => {
  try {
    const crime = await Crime.aggregate([
      {
        $match: {
          "City": req.body.city.toUpperCase()
        }
      },
      {
        $addFields: {
          hour: {
            $let: {
              vars: {
                timePart: { $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 1] },
                hourPart: { $arrayElemAt: [{ $split: [{ $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 1] }, ":"] }, 0] },
                ampm: { $arrayElemAt: [{ $split: ["$Start_Date_Time", " "] }, 2] }
              },
              in: {
                $cond: {
                  if: { $eq: ["$$ampm", "PM"] },
                  then: { $add: [{ $toInt: "$$hourPart" }, 12] },
                  else: { $toInt: "$$hourPart" }
                }
              }
            }
          }
        }
      },
      {
        $match: {
          hour: {
            $gte: parseInt(req.body.timeStart),
            $lte: parseInt(req.body.timeEnd)
          }
        }
      },
      {
        $group: {
          _id: "$Crime Name1",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 1,
      },
    ]);

    if (!crime || crime.length === 0) {
      return res.status(404).json({ message: "No crime found :(" });
    }

    console.log(crime);
    console.log(crime[0].count);
    console.log(crime[0]._id);
    res.render("queryThree", { isPost: true, crime: crime[0]._id });
  } catch (err) {
    console.error("Full error:", err);
    return res.status(500).json({ message: "server error" });
  }
});

// Server
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
