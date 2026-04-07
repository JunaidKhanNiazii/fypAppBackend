const { db } = require("../config/firebase");
const { checkLevelCompletion, completeLevel, updateExerciseStats } = require("../services/levelService");

/**
 * Create a new workout
 */
const createWorkout = async (req, res) => {
    try {
        const { userId, date, exercises, notes } = req.body;

        if (!userId || !date || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({ error: "userId, date, and exercises array are required" });
        }

        const workoutData = {
            userId: parseInt(userId),
            date: date, // Format: YYYY-MM-DD
            exercises: exercises, // Array of { name, sets, reps: [], weight: [] }
            notes: notes || "",
            totalSets: exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0),
            totalExercises: exercises.length,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const workoutRef = await db.collection("workouts").add(workoutData);

        res.json({
            success: true,
            workoutId: workoutRef.id,
            message: "Workout created successfully"
        });
    } catch (err) {
        console.error("Create workout error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get user workouts
 */
const getUserWorkouts = async (req, res) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        // Workouts are stored as subcollection under users/{userId}/workouts
        let query = db.collection("users").doc(userId.toString()).collection("workouts");

        // If we have date filters, add them
        if (startDate && endDate) {
            query = query.where("date", ">=", startDate).where("date", "<=", endDate);
        } else if (startDate) {
            query = query.where("date", ">=", startDate);
        } else if (endDate) {
            query = query.where("date", "<=", endDate);
        }

        // Try to order by date
        let snapshot;
        try {
            snapshot = await query.orderBy("date", "desc").get();
        } catch (indexError) {
            console.warn("Index not available, fetching without ordering:", indexError.message);
            snapshot = await query.get();
        }

        const workouts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Sort in memory if we couldn't sort in the query
        workouts.sort((a, b) => {
            if (a.date && b.date) {
                return b.date.localeCompare(a.date);
            }
            return 0;
        });

        // Check level completion for the latest workout
        if (workouts.length > 0 && workouts[0].exercises) {
            try {
                const checkResult = await checkLevelCompletion(userId, workouts[0].exercises);
                
                if (checkResult.levelComplete) {
                    const completionResult = await completeLevel(userId);
                    await updateExerciseStats(userId, workouts[0].exercises);
                    
                    console.log(`🎉 User ${userId} completed Level ${completionResult.levelCompleted}!`);
                }
            } catch (levelError) {
                console.error("Level check error:", levelError.message);
                // Don't fail the request if level check fails
            }
        }

        res.json({
            success: true,
            workouts,
            count: workouts.length
        });
    } catch (err) {
        console.error("Get workouts error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get workout by ID
 */
const getWorkoutById = async (req, res) => {
    try {
        const { workoutId } = req.params;

        const workoutDoc = await db.collection("workouts").doc(workoutId).get();

        if (!workoutDoc.exists) {
            return res.status(404).json({ error: "Workout not found" });
        }

        res.json({
            success: true,
            workout: {
                id: workoutDoc.id,
                ...workoutDoc.data()
            }
        });
    } catch (err) {
        console.error("Get workout error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update workout
 */
const updateWorkout = async (req, res) => {
    try {
        const { workoutId } = req.params;
        const { exercises, notes } = req.body;

        const updateData = {
            updatedAt: Date.now()
        };

        if (exercises && Array.isArray(exercises)) {
            updateData.exercises = exercises;
            updateData.totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
            updateData.totalExercises = exercises.length;
        }

        if (notes !== undefined) {
            updateData.notes = notes;
        }

        await db.collection("workouts").doc(workoutId).update(updateData);

        res.json({
            success: true,
            message: "Workout updated successfully"
        });
    } catch (err) {
        console.error("Update workout error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete workout
 */
const deleteWorkout = async (req, res) => {
    try {
        const { workoutId } = req.params;

        await db.collection("workouts").doc(workoutId).delete();

        res.json({
            success: true,
            message: "Workout deleted successfully"
        });
    } catch (err) {
        console.error("Delete workout error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get workout statistics (daily, weekly, monthly)
 */
const getWorkoutStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const { period = 'weekly' } = req.query; // daily, weekly, monthly

        const today = new Date();
        let startDate;

        switch (period) {
            case 'daily':
                startDate = new Date(today);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'weekly':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
                break;
            case 'monthly':
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 30);
                break;
            default:
                startDate = new Date(today);
                startDate.setDate(today.getDate() - 7);
        }

        const startDateStr = startDate.toISOString().split('T')[0];

        // Workouts are stored as subcollection under users/{userId}/workouts
        let query = db.collection("users").doc(userId.toString()).collection("workouts")
            .where("date", ">=", startDateStr);

        // Try with ordering, fallback to no ordering if index doesn't exist
        let snapshot;
        try {
            snapshot = await query.orderBy("date", "asc").get();
        } catch (indexError) {
            console.warn("Index not available for stats, fetching without ordering:", indexError.message);
            snapshot = await query.get();
        }

        const workouts = snapshot.docs.map(doc => doc.data());

        // Sort in memory if needed
        workouts.sort((a, b) => {
            if (a.date && b.date) {
                return a.date.localeCompare(b.date);
            }
            return 0;
        });

        // Calculate statistics
        const stats = {
            totalWorkouts: workouts.length,
            totalExercises: workouts.reduce((sum, w) => {
                return sum + (w.exercises ? w.exercises.length : 0);
            }, 0),
            totalSets: workouts.reduce((sum, w) => {
                // Count total exercises as "sets" since the structure doesn't have sets
                return sum + (w.exercises ? w.exercises.length : 0);
            }, 0),
            totalReps: workouts.reduce((sum, w) => sum + (w.totalReps || 0), 0),
            workoutsByDate: {},
            exerciseFrequency: {}
        };

        // Group by date
        workouts.forEach(workout => {
            if (!stats.workoutsByDate[workout.date]) {
                stats.workoutsByDate[workout.date] = {
                    count: 0,
                    exercises: 0,
                    sets: 0,
                    reps: 0
                };
            }
            stats.workoutsByDate[workout.date].count++;
            stats.workoutsByDate[workout.date].exercises += workout.exercises ? workout.exercises.length : 0;
            stats.workoutsByDate[workout.date].sets += workout.exercises ? workout.exercises.length : 0;
            stats.workoutsByDate[workout.date].reps += workout.totalReps || 0;

            // Count exercise frequency
            if (workout.exercises && Array.isArray(workout.exercises)) {
                workout.exercises.forEach(ex => {
                    if (!stats.exerciseFrequency[ex.name]) {
                        stats.exerciseFrequency[ex.name] = 0;
                    }
                    stats.exerciseFrequency[ex.name]++;
                });
            }
        });

        res.json({
            success: true,
            period,
            stats
        });
    } catch (err) {
        console.error("Get workout stats error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    createWorkout,
    getUserWorkouts,
    getWorkoutById,
    updateWorkout,
    deleteWorkout,
    getWorkoutStats
};
