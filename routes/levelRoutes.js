const express = require('express');
const router = express.Router();
const { 
    getUserGamification, 
    checkLevelCompletion, 
    completeLevel,
    updateExerciseStats 
} = require('../services/levelService');
const { getAllLevels } = require('../config/levelConfig');

/**
 * GET /member/level
 * Get user's current level and progress
 */
router.get('/member/level', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        const gamification = await getUserGamification(userId);
        const allLevels = getAllLevels();
        
        res.json({
            success: true,
            gamification,
            allLevels
        });
    } catch (error) {
        console.error('Get level error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /member/level/check
 * Check if a workout completes the current level
 */
router.post('/member/level/check', async (req, res) => {
    try {
        const { userId, exercises } = req.body;
        
        if (!userId || !exercises) {
            return res.status(400).json({ error: 'userId and exercises are required' });
        }
        
        // Check if level is complete
        const checkResult = await checkLevelCompletion(userId, exercises);
        
        // If level is complete, award points and move to next level
        if (checkResult.levelComplete) {
            const completionResult = await completeLevel(userId);
            
            // Update exercise stats
            await updateExerciseStats(userId, exercises);
            
            return res.json({
                success: true,
                levelComplete: true,
                ...completionResult,
                message: `Congratulations! Level ${completionResult.levelCompleted} complete! You earned ${completionResult.pointsEarned} points!`
            });
        }
        
        // Level not complete, return progress
        res.json({
            success: true,
            levelComplete: false,
            currentLevel: checkResult.currentLevel,
            progress: checkResult.progress,
            message: 'Keep going! Complete the requirements to unlock the next level.'
        });
        
    } catch (error) {
        console.error('Check level error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /member/level/history
 * Get user's completed levels history
 */
router.get('/member/level/history', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        const gamification = await getUserGamification(userId);
        
        res.json({
            success: true,
            completedLevels: gamification.completedLevels || [],
            currentLevel: gamification.currentLevel,
            totalPoints: gamification.totalPoints
        });
    } catch (error) {
        console.error('Get level history error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /member/level/stats
 * Get user's exercise statistics
 */
router.get('/member/level/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }
        
        const gamification = await getUserGamification(userId);
        
        res.json({
            success: true,
            exerciseStats: gamification.exerciseStats || {}
        });
    } catch (error) {
        console.error('Get exercise stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
