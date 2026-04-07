const express = require("express");
const router = express.Router();
const {
    submitFeedback,
    getAllFeedback,
    getUserFeedback,
    updateFeedbackStatus
} = require("../controllers/feedbackController");

// Submit feedback
router.post("/", submitFeedback);

// Get all feedback (admin)
router.get("/", getAllFeedback);

// Get user feedback
router.get("/user/:userId", getUserFeedback);

// Update feedback status (admin)
router.put("/:feedbackId", updateFeedbackStatus);

module.exports = router;
