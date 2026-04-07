const { db } = require("../config/firebase");

/**
 * Submit Feedback
 */
const submitFeedback = async (req, res) => {
    try {
        const { userId, userName, userEmail, title, description, type } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: "Title and description are required" });
        }

        const feedbackData = {
            userId: userId || null,
            userName: userName || "Anonymous",
            userEmail: userEmail || "",
            title: title.trim(),
            description: description.trim(),
            type: type || "general", // general, bug, feature, complaint
            status: "pending", // pending, reviewed, resolved
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const feedbackRef = await db.collection("feedback").add(feedbackData);

        res.json({
            success: true,
            feedbackId: feedbackRef.id,
            message: "Feedback submitted successfully"
        });
    } catch (err) {
        console.error("Submit feedback error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get All Feedback (Admin)
 */
const getAllFeedback = async (req, res) => {
    try {
        const { status } = req.query;

        let query = db.collection("feedback");

        if (status) {
            query = query.where("status", "==", status);
        }

        const snapshot = await query.orderBy("createdAt", "desc").get();
        const feedback = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            feedback,
            count: feedback.length
        });
    } catch (err) {
        console.error("Get feedback error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Get User Feedback
 */
const getUserFeedback = async (req, res) => {
    try {
        const { userId } = req.params;

        const snapshot = await db.collection("feedback")
            .where("userId", "==", parseInt(userId))
            .orderBy("createdAt", "desc")
            .get();

        const feedback = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({
            success: true,
            feedback,
            count: feedback.length
        });
    } catch (err) {
        console.error("Get user feedback error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Update Feedback Status (Admin)
 */
const updateFeedbackStatus = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { status, adminResponse } = req.body;

        const updateData = {
            updatedAt: Date.now()
        };

        if (status) {
            updateData.status = status;
        }

        if (adminResponse) {
            updateData.adminResponse = adminResponse;
            updateData.respondedAt = Date.now();
        }

        await db.collection("feedback").doc(feedbackId).update(updateData);

        res.json({
            success: true,
            message: "Feedback updated successfully"
        });
    } catch (err) {
        console.error("Update feedback error:", err.message);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    submitFeedback,
    getAllFeedback,
    getUserFeedback,
    updateFeedbackStatus
};
