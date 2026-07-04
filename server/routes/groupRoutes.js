const express = require("express");
const router  = express.Router();
const { createGroup, getGroups, getGroup, addMember, removeMember, deleteGroup } = require("../controllers/groupController");
const { protect } = require("../middleware/authMiddleware");

router.post("/",                       protect, createGroup);
router.get("/",                        protect, getGroups);
router.get("/:id",                     protect, getGroup);
router.post("/:id/members",            protect, addMember);
router.delete("/:id/members/:userId",  protect, removeMember);
router.delete("/:id",                  protect, deleteGroup);

module.exports = router;
