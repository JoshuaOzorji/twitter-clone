"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getUserPosts = exports.getFollowingPosts = exports.getLikedPosts = exports.getAllPosts = exports.likeUnlikePost = exports.commentOnPost = exports.deletePost = exports.createPost = void 0;
const errorHandler_1 = __importDefault(require("../utils/errorHandler"));
const user_model_1 = __importDefault(require("../models/user.model"));
const cloudinary_1 = require("cloudinary");
const post_model_1 = __importDefault(require("../models/post.model"));
const notification_model_1 = __importDefault(require("../models/notification.model"));
const createPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        if (!text && !img) {
            return res.status(400).json({ error: "Post must have text or image" });
        }
        if (img) {
            const uploadedResponse = yield cloudinary_1.v2.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }
        const newPost = new post_model_1.default({
            user: userId,
            text,
            img,
        });
        yield newPost.save();
        res.status(201).json(newPost);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "createPost");
    }
});
exports.createPost = createPost;
const deletePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const post = yield post_model_1.default.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        if (post.user.toString() !== req.user._id.toString()) {
            return res
                .status(401)
                .json({ error: "You are not authorized to delete this post" });
        }
        const imgId = post.img && ((_a = post.img.split("/").pop()) === null || _a === void 0 ? void 0 : _a.split(".")[0]);
        if (imgId) {
            yield cloudinary_1.v2.uploader.destroy(imgId);
        }
        else {
            console.log("Image ID not found");
        }
        yield post_model_1.default.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Post deleted successfully" });
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "deletePost");
    }
});
exports.deletePost = deletePost;
const commentOnPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;
        if (!text) {
            return res.status(400).json({ error: "Text field is required" });
        }
        const post = yield post_model_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        const comment = { user: userId, text };
        post.comments.push(comment);
        yield post.save();
        res.status(200).json(post);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "likeUnlikePost");
    }
});
exports.commentOnPost = commentOnPost;
const likeUnlikePost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const { id: postId } = req.params;
        const post = yield post_model_1.default.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });
        }
        const userLikedPost = post.likes.includes(userId);
        if (userLikedPost) {
            //Unlike post
            yield post_model_1.default.updateOne({ _id: postId }, { $pull: { likes: userId } });
            yield user_model_1.default.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
            const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
            res.status(200).json(updatedLikes);
        }
        else {
            // Like post
            post.likes.push(userId);
            yield user_model_1.default.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
            yield post.save();
            const notification = new notification_model_1.default({
                from: userId,
                to: post.user,
                type: "like",
            });
            yield notification.save();
            const updatedLikes = post.likes;
            res.status(200).json(updatedLikes);
        }
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "likeUnlikePost");
    }
});
exports.likeUnlikePost = likeUnlikePost;
const getAllPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_model_1.default.find()
            .sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comments.user", select: "-password" });
        if (posts.length === 0) {
            return res.status(200).json([]);
        }
        res.status(200).json(posts);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "getAllPosts");
    }
});
exports.getAllPosts = getAllPosts;
const getLikedPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const userId = req.params.id;
    try {
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const likedPosts = yield post_model_1.default.find({
            _id: { $in: user.likedPosts },
        })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comments.user", select: "-password" });
        res.status(200).json(likedPosts);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "getLikedPosts");
    }
});
exports.getLikedPosts = getLikedPosts;
const getFollowingPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user._id;
        const user = yield user_model_1.default.findById(userId);
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const following = user.following;
        const feedPosts = yield post_model_1.default.find({ user: { $in: following } })
            .sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comments.user", select: "-password" });
        res.status(200).json(feedPosts);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "getFollowingPosts");
    }
});
exports.getFollowingPosts = getFollowingPosts;
const getUserPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username } = req.params;
        const user = yield user_model_1.default.findOne({ username });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        const posts = yield post_model_1.default.find({ user: user._id })
            .sort({ createdAt: -1 })
            .populate({ path: "user", select: "-password" })
            .populate({ path: "comments.user", select: "-password" });
        res.status(200).json(posts);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "getUserPosts");
    }
});
exports.getUserPosts = getUserPosts;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const postId = req.params.id;
        const post = yield post_model_1.default.findById(postId)
            .populate("user", "username fullName profileImg")
            .populate("comments.user", "username fullName profileImg")
            .exec();
        if (!post) {
            res.status(404).json({ message: "Post not found" });
        }
        res.status(200).json(post);
    }
    catch (error) {
        (0, errorHandler_1.default)(res, error, "updateUser");
    }
});
exports.getUserById = getUserById;
