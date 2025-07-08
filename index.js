const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require("cors");
const adminRouter = require('./route/admin');
const userRouter = require('./route/user');

require('dotenv').config();

const app = express();
const allowedOrigins = [
  'http://localhost:5500',
  'https://moviebookingfrontend.vercel.app',
  'https://moviebookingfrontend-git-main-atharv-consuls-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));



console.log("hello");
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("Connected"))
  .catch(err => console.log("Error:", err));

app.use(bodyParser.json());

app.use("/admin", adminRouter);
app.use("/user", userRouter);

app.get("/", (req, res) => {
  res.send("Movie Booking API is running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
