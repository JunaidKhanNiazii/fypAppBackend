const express = require("express");
const userController = require("../controllers/userController");

const router = express.Router();

// Get all users and total count
router.get("/", userController.getAllUsers);

// Search users
router.get("/search", userController.searchUsers);

// Update user
router.put("/:userId", userController.updateUser);

// Delete user (Firestore + GitHub)
router.delete("/:userId", userController.deleteUser);

module.exports = router;

module.exports = router;
