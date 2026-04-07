const { db } = require("../config/firebase");
const githubService = require("../services/githubService");

/**
 * Member Login
 */
const memberLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Get user from Firestore by email
        const usersSnapshot = await db.collection("users")
            .where("email", "==", email.toLowerCase().trim())
            .get();

        if (usersSnapshot.empty) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();

        // Check password
        if (userData.password !== password) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Return user data (without password)
        const { password: _, ...userInfo } = userData;

        res.json({
            success: true,
            user: {
                ...userInfo,
                id: userDoc.id,
                userId: userData.userId || userDoc.id  // Support both old and new users
            }
        });
    } catch (err) {
        console.error("Member login error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get Member Profile
 */
const getMemberProfile = async (req, res) => {
    try {
        const { userId } = req.params;

        const userDoc = await db.collection("users").doc(userId.toString()).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        const userData = userDoc.data();
        const { password: _, ...userInfo } = userData;

        res.json({
            success: true,
            user: {
                ...userInfo,
                id: userDoc.id
            }
        });
    } catch (err) {
        console.error("Get member profile error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update Member Profile
 */
const updateMemberProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, password, images } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone) updateData.phone = phone.trim();
        if (password) updateData.password = password;

        // Handle image updates
        if (images && Array.isArray(images)) {
            const finalUrls = [];
            const userDoc = await db.collection("users").doc(userId.toString()).get();
            const existingUserData = userDoc.exists ? userDoc.data() : {};
            const safeUsername = (existingUserData.username || "user").trim().replace(/[^a-zA-Z0-9_-]/g, "_");

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img && img.startsWith("data:image/")) {
                    const base64Data = img.split(",")[1];
                    const fileName = `${safeUsername}/${userId}_${i}.jpg`;
                    const currentSha = await githubService.getFileSha(fileName);
                    const url = await githubService.uploadImage(fileName, base64Data, currentSha);
                    finalUrls.push(url);
                } else {
                    finalUrls.push(img);
                }
            }
            updateData.images = finalUrls;
        }

        updateData.updatedAt = Date.now();

        await db.collection("users").doc(userId.toString()).update(updateData);

        res.json({
            success: true,
            message: "Profile updated successfully",
            images: updateData.images
        });
    } catch (err) {
        console.error("Update member profile error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Register a new user
 */
const registerUser = async (req, res) => {
    try {
        const { username, name, email, password, phone, images } = req.body;

        if (!username || !name || !email || !password || !images || images.length !== 4) {
            return res.status(400).json({ error: "Username, Name, Email, Password and 4 images are required" });
        }

        console.log(`🚀 Starting registration for: ${username} (${email})`);

        // 1. Transaction to get auto-incrementing userId
        const counterRef = db.collection("metadata").doc("counters");
        const userId = await db.runTransaction(async (transaction) => {
            const counterDoc = await transaction.get(counterRef);
            let nextId = 1;
            if (counterDoc.exists) {
                nextId = (counterDoc.data().userCount || 0) + 1;
            }
            transaction.set(counterRef, { userCount: nextId }, { merge: true });
            return nextId;
        });

        const uploadedUrls = [];
        const safeUsername = username.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

        // 2. Upload images to GitHub via service
        for (let i = 0; i < images.length; i++) {
            const base64Data = images[i].includes(",") ? images[i].split(",")[1] : images[i];
            const fileName = `${safeUsername}/${userId}_${i}.jpg`;
            const url = await githubService.uploadImage(fileName, base64Data);
            uploadedUrls.push(url);
            console.log(`✅ Image ${i} uploaded: ${url}`);
        }

        // 3. Save user to Firestore
        const userData = {
            userId: userId,
            username: username.trim(),
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password,
            phone: phone ? phone.trim() : null,
            images: uploadedUrls,
            joinDate: new Date().toISOString().split('T')[0],
            createdAt: Date.now(),
        };

        await db.collection("users").doc(userId.toString()).set(userData);

        res.json({
            success: true,
            userId,
            message: "User registered successfully",
            urls: uploadedUrls
        });
    } catch (err) {
        console.error("Registration error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get all users
 */
const getAllUsers = async (req, res) => {
    try {
        console.log("Fetching all users...");
        const snapshot = await db.collection("users").orderBy("userId", "asc").get();
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const totalCount = users.length;
        res.json({ users, totalCount });
    } catch (err) {
        console.error("Error fetching users:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Search users
 */
const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Search query is required" });

        const q = query.toLowerCase();
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(user =>
                user.name?.toLowerCase().includes(q) ||
                user.email?.toLowerCase().includes(q) ||
                user.username?.toLowerCase().includes(q)
            );

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, email, phone, username, password, joinDate, images } = req.body;

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.trim().toLowerCase();
        if (phone) updateData.phone = phone.trim();
        if (username) updateData.username = username.trim();
        if (password) updateData.password = password;
        if (joinDate) updateData.joinDate = joinDate.trim();

        if (images && Array.isArray(images)) {
            const finalUrls = [];
            const userDoc = await db.collection("users").doc(userId.toString()).get();
            const existingUserData = userDoc.exists ? userDoc.data() : {};
            const safeUsername = (username || existingUserData.username || "user").trim().replace(/[^a-zA-Z0-9_-]/g, "_");

            for (let i = 0; i < images.length; i++) {
                const img = images[i];
                if (img && img.startsWith("data:image/")) {
                    const base64Data = img.split(",")[1];
                    const fileName = `${safeUsername}/${userId}_${i}.jpg`;
                    const currentSha = await githubService.getFileSha(fileName);
                    const url = await githubService.uploadImage(fileName, base64Data, currentSha);
                    finalUrls.push(url);
                } else {
                    finalUrls.push(img);
                }
            }
            updateData.images = finalUrls;
        }

        await db.collection("users").doc(userId.toString()).update(updateData);
        res.json({ success: true, message: "User updated successfully", images: updateData.images });
    } catch (err) {
        console.error("Update error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const userDoc = await db.collection("users").doc(userId.toString()).get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        const userData = userDoc.data();
        const safeUsername = userData.username.trim().replace(/[^a-zA-Z0-9_-]/g, "_");

        // Delete GitHub folder
        await githubService.cleanupFolder(safeUsername);

        // Delete from Firestore
        await db.collection("users").doc(userId.toString()).delete();

        res.json({ success: true, message: "User deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    memberLogin,
    getMemberProfile,
    updateMemberProfile,
    registerUser,
    getAllUsers,
    searchUsers,
    updateUser,
    deleteUser
};
