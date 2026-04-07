const admin = require('firebase-admin');
const { getLevelRequirements, getMaxLevel } = require('../config/levelConfig');

const db = admin.firestore();

/**
 * Initialize gamification data for a user
 */
async function initializeUserGamification(userId) {
    const userRef = db.collection('users').doc(userId.toString());
    
    const gamificationData = {
        currentLevel: 1,
        totalPoints: 0,
        levelProgress: {
            level: 1,
            required: { "Bicep Curl": 10 },
            completed: { "Bicep Curl": 0 },
            isComplete: false
        },
        completedLevels: [],
        exerciseStats: {
            "Bicep Curl": { totalReps: 0, bestSession: 0, lastPerformed: null },
            "Lateral Raise": { totalReps: 0, bestSession: 0, lastPerformed: null },
            "Squat": { totalReps: 0, bestSession: 0, lastPerformed: null }
        }
    };
    
    await userRef.update({ gamification: gamificationData });
    return gamificationData;
}

/**
 * Get user's gamification data
 */
async function getUserGamification(userId) {
    const userRef = db.collection('users').doc(userId.toString());
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
        throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Initialize if doesn't exist
    if (!userData.gamification) {
        return await initializeUserGamification(userId);
    }
    
    return userData.gamification;
}

/**
 * Check if workout completes current level
 */
async function checkLevelCompletion(userId, workoutExercises) {
    const gamification = await getUserGamification(userId);
    const currentLevel = gamification.currentLevel;
    
    // If already at max level
    if (currentLevel > getMaxLevel()) {
        return {
            levelComplete: false,
            message: 'You have reached the maximum level!',
            gamification
        };
    }
    
    const levelReq = getLevelRequirements(currentLevel);
    if (!levelReq) {
        return { levelComplete: false, message: 'Invalid level', gamification };
    }
    
    // Get ALL user workouts to calculate total reps
    const userRef = db.collection('users').doc(userId.toString());
    const workoutsSnapshot = await userRef.collection('workouts').get();
    
    // Calculate total reps for each exercise across ALL workouts
    const totalReps = {};
    workoutsSnapshot.docs.forEach(doc => {
        const workout = doc.data();
        if (workout.exercises && Array.isArray(workout.exercises)) {
            workout.exercises.forEach(exercise => {
                const name = exercise.name;
                if (!totalReps[name]) {
                    totalReps[name] = 0;
                }
                totalReps[name] += exercise.reps || 0;
            });
        }
    });
    
    // Check if all required exercises meet the rep count
    let allRequirementsMet = true;
    const progress = {};
    
    for (const [exerciseName, requiredReps] of Object.entries(levelReq.exercises)) {
        const completedReps = totalReps[exerciseName] || 0;
        progress[exerciseName] = {
            required: requiredReps,
            completed: completedReps,
            met: completedReps >= requiredReps
        };
        
        if (completedReps < requiredReps) {
            allRequirementsMet = false;
        }
    }
    
    return {
        levelComplete: allRequirementsMet,
        currentLevel,
        progress,
        levelReq,
        gamification
    };
}

/**
 * Complete level and award points
 */
async function completeLevel(userId) {
    const userRef = db.collection('users').doc(userId.toString());
    const gamification = await getUserGamification(userId);
    
    const currentLevel = gamification.currentLevel;
    const levelReq = getLevelRequirements(currentLevel);
    
    if (!levelReq) {
        throw new Error('Invalid level');
    }
    
    // Award points
    const pointsEarned = levelReq.points;
    const newTotalPoints = gamification.totalPoints + pointsEarned;
    
    // Move to next level
    const nextLevel = currentLevel + 1;
    const nextLevelReq = getLevelRequirements(nextLevel);
    
    // Update completed levels
    const completedLevels = gamification.completedLevels || [];
    completedLevels.push({
        level: currentLevel,
        completedAt: new Date().toISOString(),
        pointsEarned: pointsEarned,
        badge: levelReq.badge
    });
    
    // Prepare next level progress
    const nextLevelProgress = nextLevelReq ? {
        level: nextLevel,
        required: nextLevelReq.exercises,
        completed: Object.keys(nextLevelReq.exercises).reduce((acc, key) => {
            acc[key] = 0;
            return acc;
        }, {}),
        isComplete: false
    } : null;
    
    // Update user document
    await userRef.update({
        'gamification.currentLevel': nextLevel,
        'gamification.totalPoints': newTotalPoints,
        'gamification.completedLevels': completedLevels,
        'gamification.levelProgress': nextLevelProgress
    });
    
    return {
        levelCompleted: currentLevel,
        pointsEarned,
        newTotalPoints,
        nextLevel,
        badge: levelReq.badge,
        isMaxLevel: nextLevel > getMaxLevel()
    };
}

/**
 * Update exercise stats
 */
async function updateExerciseStats(userId, workoutExercises) {
    const userRef = db.collection('users').doc(userId.toString());
    const gamification = await getUserGamification(userId);
    
    const exerciseStats = gamification.exerciseStats || {};
    const today = new Date().toISOString().split('T')[0];
    
    // Update stats for each exercise
    workoutExercises.forEach(exercise => {
        const name = exercise.name;
        const reps = exercise.reps || 0;
        
        if (!exerciseStats[name]) {
            exerciseStats[name] = { totalReps: 0, bestSession: 0, lastPerformed: null };
        }
        
        exerciseStats[name].totalReps += reps;
        exerciseStats[name].bestSession = Math.max(exerciseStats[name].bestSession, reps);
        exerciseStats[name].lastPerformed = today;
    });
    
    await userRef.update({ 'gamification.exerciseStats': exerciseStats });
    return exerciseStats;
}

module.exports = {
    initializeUserGamification,
    getUserGamification,
    checkLevelCompletion,
    completeLevel,
    updateExerciseStats
};
