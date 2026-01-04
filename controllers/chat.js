const Chat = require("../models/chat");
const User = require("../models/user");
const Notification = require("../models/notification");

module.exports.renderInbox = async (req, res) => {
    const currentUserId = req.user._id;

    const conversations = await Chat.aggregate([
        {
            $match: {
                $or: [{ sender: currentUserId }, { receiver: currentUserId }]
            }
        },
        { $sort: { timestamp: -1 } },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ["$sender", currentUserId] },
                        "$receiver",
                        "$sender"
                    ]
                },
                lastMessage: { $first: "$$ROOT" }
            }
        }
    ]);

    const populatedConversations = await User.populate(conversations, { path: "_id", select: "username image" });

    res.render("users/inbox.ejs", { conversations: populatedConversations });
};

module.exports.renderChat = async (req, res) => {
    const { userId } = req.params;
    const otherUser = await User.findById(userId);
    const currentUserId = req.user._id;

    // Fetch chat history
    const chats = await Chat.find({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId }
        ]
    }).sort({ timestamp: 1 });

    // Mark notifications from this user as read
    await Notification.updateMany(
        { user: currentUserId, type: "message", isRead: false }, // Simplified for demo
        { isRead: true }
    );
    
    // Mark chats as read
    await Chat.updateMany(
        { sender: userId, receiver: currentUserId, isRead: false },
        { isRead: true }
    );

    res.render("users/chat.ejs", { chats, otherUser });
};