const express = require("express");
const router = express.Router();
const {
    createWorkout,
    getUserWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout,
    getWorkoutStats
} = require("../controllers/workoutController");

// Workout CRUD
router.post("/", createWorkout);
router.get("/user/:userId", getUserWorkouts);
router.get("/:workoutId", getWorkoutById);
router.put("/:workoutId", updateWorkout);
router.delete("/:workoutId", deleteWorkout);

// Statistics
router.get("/stats/:userId", getWorkoutStats);

module.exports = router;
