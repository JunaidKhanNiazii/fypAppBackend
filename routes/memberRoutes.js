const express = require("express");
const router = express.Router();
const { memberLogin, getMemberProfile, updateMemberProfile } = require("../controllers/userController");

// Member authentication
router.post("/login", memberLogin);

// Member profile
router.get("/profile/:userId", getMemberProfile);
router.put("/profile/:userId", updateMemberProfile);

module.exports = router;
