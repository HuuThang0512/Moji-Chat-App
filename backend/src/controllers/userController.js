import User from "../models/User.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({ user });
  } catch(error) {
    console.error("Error fetching user", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const test = async (req, res) => {
  return res.sendStatus(204);
};

export const searchUserByUsername = async (req, res) => {
  try {
    const { username } = req.query;

    if(!username || username.trim() === "") {
      return res.status(400).json({ message: "Username is required" });
    }
    const user = await User.findOne({ username }).select("_id displayName username avatarUrl")
    return res.status(200).json({ user });
  } catch(error) {
    console.error("Error searching user by username", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}