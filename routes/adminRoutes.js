const express = require("express");
const adminController = require("../controllers/adminController");

const router = express.Router();

// Admin authentication
router.post("/login", adminController.adminLogin);

// Dashboard stats
router.get("/dashboard/stats", adminController.getDashboardStats);

// Analytics
router.get("/analytics", adminController.getAnalytics);

// Admin profile
router.get("/profile/:adminId", adminController.getAdminProfile);
router.put("/profile/:adminId", adminController.updateAdminProfile);
router.put("/password/:adminId", adminController.changeAdminPassword);

// Initialize admin (run once)
router.post("/initialize", adminController.initializeAdmin);

module.exports = router;
