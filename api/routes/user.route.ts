import express from "express";
import { protectRoute } from "../middleware/protectRoute";
import {
	followUnfollowUser,
	getSuggestedUsers,
	getUserProfile,
	updateUser,
} from "../controllers/user.controller";

const router = express.Router();

router.get("/profile/:username", protectRoute, getUserProfile);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/update", protectRoute, updateUser);

export default router;
