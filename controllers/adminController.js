const { db, admin } = require("../config/firebase");

/**
 * Admin Login
 */
const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Get admin from Firestore
        const adminSnapshot = await db.collection("admins").where("email", "==", email.toLowerCase()).get();

        if (adminSnapshot.empty) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const adminDoc = adminSnapshot.docs[0];
        const adminData = adminDoc.data();

        // Check password (in production, use bcrypt)
        if (adminData.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Return admin data (without password)
        const { password: _, ...adminInfo } = adminData;

        res.json({
            success: true,
            admin: {
                ...adminInfo,
                adminId: adminDoc.id
            }
        });
    } catch (err) {
        console.error("Admin login error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Dashboard Statistics
 */
const getDashboardStats = async (req, res) => {
    try {
        // Get total members
        const usersSnapshot = await db.collection("users").get();
        const totalMembers = usersSnapshot.size;

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Get active members today (who have workout records for today)
        // Workouts are stored as subcollections: users/{userId}/workouts/{workoutId}
        const activeToday = new Set();
        let totalWorkouts = 0;

        // Iterate through all users to check their workouts subcollection
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // Get all workouts for this user
            const userWorkoutsSnapshot = await db.collection("users")
                .doc(userId)
                .collection("workouts")
                .get();
            
            totalWorkouts += userWorkoutsSnapshot.size;

            // Check if user has workout today
            const todayWorkoutsSnapshot = await db.collection("users")
                .doc(userId)
                .collection("workouts")
                .where("date", "==", today)
                .get();
            
            if (!todayWorkoutsSnapshot.empty) {
                activeToday.add(parseInt(userId));
            }
        }

        // Get recent members (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoTimestamp = sevenDaysAgo.getTime();

        const recentMembers = usersSnapshot.docs.filter(doc => {
            const createdAt = doc.data().createdAt || 0;
            return createdAt >= sevenDaysAgoTimestamp;
        }).length;

        console.log(`Dashboard Stats: Total Members: ${totalMembers}, Active Today: ${activeToday.size}, Total Workouts: ${totalWorkouts}`);

        res.json({
            success: true,
            stats: {
                totalMembers,
                activeToday: activeToday.size,
                totalWorkouts,
                recentMembers
            }
        });
    } catch (err) {
        console.error("Dashboard stats error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Analytics Data
 */
const getAnalytics = async (req, res) => {
    try {
        const { period = '7' } = req.query; // days
        const days = parseInt(period);

        // Get date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString().split('T')[0];

        const dailyStats = {};
        const exerciseStats = {};

        // Get all users
        const usersSnapshot = await db.collection("users").get();

        // Iterate through all users to get their workouts
        for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            
            // Get workouts for this user in the date range
            const userWorkoutsSnapshot = await db.collection("users")
                .doc(userId)
                .collection("workouts")
                .where("date", ">=", startDateStr)
                .get();

            userWorkoutsSnapshot.forEach(doc => {
                const data = doc.data();
                const workoutDate = data.date;

                if (workoutDate) {
                    // Daily stats
                    if (!dailyStats[workoutDate]) {
                        dailyStats[workoutDate] = {
                            date: workoutDate,
                            workouts: 0,
                            users: new Set()
                        };
                    }
                    dailyStats[workoutDate].workouts++;
                    dailyStats[workoutDate].users.add(data.userId);

                    // Exercise stats
                    if (data.exercises && Array.isArray(data.exercises)) {
                        data.exercises.forEach(exercise => {
                            if (!exerciseStats[exercise.name]) {
                                exerciseStats[exercise.name] = {
                                    name: exercise.name,
                                    count: 0,
                                    totalReps: 0
                                };
                            }
                            exerciseStats[exercise.name].count++;
                            exerciseStats[exercise.name].totalReps += exercise.reps || 0;
                        });
                    }
                }
            });
        }

        // Convert to arrays
        const dailyData = Object.values(dailyStats).map(stat => ({
            date: stat.date,
            workouts: stat.workouts,
            activeUsers: stat.users.size
        })).sort((a, b) => a.date.localeCompare(b.date));

        const topExercises = Object.values(exerciseStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        res.json({
            success: true,
            analytics: {
                dailyData,
                topExercises,
                period: days
            }
        });
    } catch (err) {
        console.error("Analytics error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Admin Profile
 */
const getAdminProfile = async (req, res) => {
    try {
        const { adminId } = req.params;

        const adminDoc = await db.collection("admins").doc(adminId).get();

        if (!adminDoc.exists) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const adminData = adminDoc.data();
        const { password: _, ...adminInfo } = adminData;

        res.json({
            success: true,
            admin: {
                ...adminInfo,
                adminId: adminDoc.id
            }
        });
    } catch (err) {
        console.error("Get admin profile error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update Admin Profile
 */
const updateAdminProfile = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { name, email, phone, profileImage, gymName, address } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone) updateData.phone = phone.trim();
        if (profileImage) updateData.profileImage = profileImage;
        if (gymName) updateData.gymName = gymName.trim();
        if (address) updateData.address = address.trim();

        updateData.updatedAt = Date.now();

        await db.collection("admins").doc(adminId).update(updateData);

        res.json({
            success: true,
            message: "Profile updated successfully"
        });
    } catch (err) {
        console.error("Update admin profile error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Change Admin Password
 */
const changeAdminPassword = async (req, res) => {
    try {
        const { adminId } = req.params;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current and new password are required" });
        }

        const adminDoc = await db.collection("admins").doc(adminId).get();

        if (!adminDoc.exists) {
            return res.status(404).json({ error: "Admin not found" });
        }

        const adminData = adminDoc.data();

        // Verify current password
        if (adminData.password !== currentPassword) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        // Update password
        await db.collection("admins").doc(adminId).update({
            password: newPassword,
            updatedAt: Date.now()
        });

        res.json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (err) {
        console.error("Change password error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Initialize Default Admin (Run once)
 */
const initializeAdmin = async (req, res) => {
    try {
        const email = "fitzonefyp@gmail.com";
        const password = "junaid123";

        // Check if admin already exists
        const existingAdmin = await db.collection("admins").where("email", "==", email).get();

        if (!existingAdmin.empty) {
            return res.json({
                success: true,
                message: "Admin already exists"
            });
        }

        // Create admin
        const adminData = {
            email: email,
            password: password, // In production, use bcrypt
            name: "Admin",
            role: "admin",
            gymName: "FITZONE",
            phone: "",
            address: "",
            profileImage: "",
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await db.collection("admins").add(adminData);

        res.json({
            success: true,
            message: "Admin created successfully",
            credentials: {
                email: email,
                password: password
            }
        });
    } catch (err) {
        console.error("Initialize admin error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    adminLogin,
    getDashboardStats,
    getAnalytics,
    getAdminProfile,
    updateAdminProfile,
    changeAdminPassword,
    initializeAdmin
};
