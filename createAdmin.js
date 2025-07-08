const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const { User } = require("./db/index"); 

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const email = "atharvconsul45@gmail.com";

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("⚠️ Admin already exists.");
    }

    const hashedPassword = await bcrypt.hash("7226", 10);
    const admin = new User({
      name: "Atharv Consul",
      email: email,
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin created successfully.");
    process.exit();
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
}

createAdmin();
