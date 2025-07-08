const { User } = require("../db/index"); 

async function isAdmin(req, res, next) {
  try {
    if (!req.user || !req.user.id) {
      return res.status(400).json({ message: "Unauthorized: No user info in token" });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(400).json({ message: "User not found in database" });
    }

    if (user.role !== 'admin') {
      return res.status(400).json({ message: "Access denied: Admins only" });
    }
    next();
  } catch (err) {
    console.error("isAdmin middleware error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = isAdmin;
