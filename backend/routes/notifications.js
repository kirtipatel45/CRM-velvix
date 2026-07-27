import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Get all notifications for a user
router.get("/", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Create a notification
router.post("/", protect, async (req, res) => {
  try {
    let { title, message, type } = req.body;

    // Handle payload if title was passed as a nested notification object
    if (typeof title === "object" && title !== null) {
      message = title.message || message;
      type = title.type || type;
      title = title.title;
    }

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required fields",
      });
    }

    const notification = await Notification.create({
      userId: req.user._id,
      title,
      message,
      type: type || "info",
    });
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
});

// Mark single notification as read
router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error("Error marking notification read:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Mark all notifications as read
router.put("/read-all", protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true, message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications read:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Clear all notifications
router.delete("/", protect, async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: "Notifications cleared" });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

export default router;
