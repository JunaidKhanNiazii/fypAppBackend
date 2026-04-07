// Level Requirements Configuration
// Each level defines required exercises and reps to complete

const LEVEL_REQUIREMENTS = {
    1: {
        exercises: { "Bicep Curl": 10 },
        points: 10,
        badge: "Beginner",
        description: "Complete 10 Bicep Curl reps"
    },
    2: {
        exercises: { "Bicep Curl": 20 },
        points: 20,
        badge: "Novice",
        description: "Complete 20 Bicep Curl reps"
    },
    3: {
        exercises: { "Lateral Raise": 15 },
        points: 30,
        badge: "Learner",
        description: "Complete 15 Lateral Raise reps"
    },
    4: {
        exercises: { "Bicep Curl": 25, "Lateral Raise": 25 },
        points: 50,
        badge: "Intermediate",
        description: "Complete 25 reps each: Bicep Curl & Lateral Raise"
    },
    5: {
        exercises: { "Squat": 20 },
        points: 70,
        badge: "Advanced",
        description: "Complete 20 Squat reps"
    },
    6: {
        exercises: { "Bicep Curl": 30, "Squat": 30 },
        points: 100,
        badge: "Expert",
        description: "Complete 30 reps each: Bicep Curl & Squat"
    },
    7: {
        exercises: { "Lateral Raise": 35, "Squat": 35 },
        points: 140,
        badge: "Master",
        description: "Complete 35 reps each: Lateral Raise & Squat"
    },
    8: {
        exercises: { "Bicep Curl": 40, "Lateral Raise": 40, "Squat": 40 },
        points: 200,
        badge: "Elite",
        description: "Complete 40 reps each: All 3 exercises"
    },
    9: {
        exercises: { "Bicep Curl": 50, "Lateral Raise": 50, "Squat": 50 },
        points: 300,
        badge: "Champion",
        description: "Complete 50 reps each: All 3 exercises"
    },
    10: {
        exercises: { "Bicep Curl": 60, "Lateral Raise": 60, "Squat": 60 },
        points: 500,
        badge: "Legend",
        description: "Complete 60 reps each: All 3 exercises"
    }
};

// Get level requirements
function getLevelRequirements(level) {
    return LEVEL_REQUIREMENTS[level] || null;
}

// Get all levels
function getAllLevels() {
    return LEVEL_REQUIREMENTS;
}

// Get max level
function getMaxLevel() {
    return Object.keys(LEVEL_REQUIREMENTS).length;
}

module.exports = {
    LEVEL_REQUIREMENTS,
    getLevelRequirements,
    getAllLevels,
    getMaxLevel
};
