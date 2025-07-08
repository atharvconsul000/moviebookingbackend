const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Movie, Booking, Review} = require("../db/index");
const authenticateJWT = require("../middleware/auth");
const isUser = require("../middleware/user");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
require("dotenv").config();


router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashed, role: "user" });
    await newUser.save();

    res.status(200).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ message: "Signup failed", error: err.message });
  }
});


router.post("/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Signin failed", error: err.message });
  }
});


router.get("/movies", authenticateJWT, isUser, async (req, res) => {
  try {
    const movies = await Movie.find();
    res.json(movies);
  } catch (err) {
    res.status(500).json({ message: "Failed to load movies" });
  }
});


router.post("/book/:movieId", authenticateJWT, isUser, async (req, res) => {
  const userId = req.user.id;
  const movieId = req.params.movieId;
  const { numberOfSeats } = req.body;

  if (numberOfSeats < 1 || numberOfSeats > 4) {
    return res.status(400).json({ message: "Can book 1 to 4 seats only" });
  }

  try {
    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(400).json({ message: "Movie not found" });

    const existing = await Booking.findOne({ userId, movieId });
    if (existing) return res.status(400).json({ message: "Already booked" });

    if (movie.availableSeats < numberOfSeats) {
      return res.status(400).json({ message: "Not enough seats" });
    }

    const booking = new Booking({ userId, movieId, numberOfSeats });
    await booking.save();

    movie.availableSeats -= numberOfSeats;
    if (movie.availableSeats === 0) movie.houseFull = true;
    await movie.save();

    res.json({ message: "Booking successful" });
  } catch (err) {
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
});


router.delete("/cancel/:movieId", authenticateJWT, isUser, async (req, res) => {
  const userId = req.user.id;
  const movieId = req.params.movieId;

  try {
    const booking = await Booking.findOne({ userId, movieId });
    if (!booking) return res.status(404).json({ message: "No booking found" });

    const movie = await Movie.findById(movieId);
    if (movie) {
      movie.availableSeats += booking.numberOfSeats;
      movie.houseFull = false;
      await movie.save();
    }

    await booking.deleteOne();
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    res.status(500).json({ message: "Cancellation failed", error: err.message });
  }
});

router.get("/bookings/:movieId", authenticateJWT, isUser, async (req, res) => {
  const userId = req.user.id;
  const movieId = req.params.movieId;
  try {
    const existing = await Booking.findOne({ userId, movieId });
    res.json(existing);
  } catch (err) {
    res.status(500).json({ message: "Failed to load bookings", error: err.message });
  }
});

router.post("/rate/:movieId", authenticateJWT, isUser, async (req, res) => {
  const userId = req.user.id;
  const movieId = req.params.movieId;
  const rating = req.body.rating;
  const comment = req.body.comment;

  try {
    const booking = await Booking.findOne({ userId, movieId });
    if (!booking) {
      return res.status(400).json({ message: "You must book this movie before reviewing." });
    }
    const existingReview = await Review.findOne({ user: userId, movie: movieId });
    if (existingReview) {
      return res.status(400).json({ message: "You have already reviewed this movie." });
    }
    if (typeof rating !== "number" || rating < 0 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a number between 0 and 5." });
    }

    const movie = await Movie.findById(movieId);
    if (!movie) return res.status(400).json({ message: "Movie not found" });

    const review = new Review({
        user: userId,
        movie: movieId,
        movieName: movie.name,
        rating: rating,
        comment: comment
      });

    await review.save();
    res.status(201).json({ message: "Review submitted successfully." });

  } catch (err) {
    res.status(500).json({ message: "Failed to submit review", error: err.message });
  }
});

router.get("/reviews/:movieName", authenticateJWT, isUser, async (req, res) => {
  const movieName = req.params.movieName;

  try {
    const reviews = await Review.find({ movieName }).sort({ rating: -1 });

    const result = [];

    for (const review of reviews) {
      const user = await User.findById(review.user); 
      result.push({
        userName: user ? user.name : "Unknown",
        rating: review.rating,
        comment: review.comment,
        time: review.createdAt,
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to load reviews", error: err.message });
  }
});
router.get("/user/:userId", authenticateJWT, isUser, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(400).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user", error: err.message });
  }
});
router.get("/verify/:bookingId", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(400).json({ message: "Booking not found" });
    }
    const movie = await Movie.findById(booking.movieId).select("name time");

    const user = await User.findById(booking.userId).select("name");

    if (!movie || !user) {
      return res.status(400).json({ message: "Movie or user not found" });
    }
    
    res.json({
      bookingId: booking._id,
      movieName: movie.name,
      movieTime: movie.time,
      numberOfSeats: booking.numberOfSeats,
      bookingTime: booking.bookingTime,
      userName: user.name,
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

module.exports = router;
