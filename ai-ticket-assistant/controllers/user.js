import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { inngest } from "../inngest/client.js";

export const signup = async (req, res) => {
  const { email, password, skills = [] } = req.body;
  try {
    // await the hash
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed, skills });

    // Fire inngest event
    await inngest.send({
      name: "user/signup",
      data: {
        email,
      },
    });

    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        skills: user.skills,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Signup failed",
      details: error.message,
    });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // await findOne
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        _id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        skills: user.skills,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Login failed",
      details: error.message,
    });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
      });

    jwt.verify(token, process.env.JWT_SECRET, (err /*, decoded */) => {
      if (err)
        return res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
    });

    res.json({
      success: true,
      message: "Logout successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Logout failed",
      details: error.message,
    });
  }
};

export const updateUser = async (req, res) => {
  const { skills = [], role, email } = req.body;
  try {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }
    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({
        success: false,
        error: "User not found",
      });

    await User.updateOne(
      { email },
      { skills: skills.length ? skills : user.skills, role }
    );
    return res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Update failed",
      details: error.message,
    });
  }
};

// ✅ MAKE SURE getUsers IS EXPORTED
export const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
      });
    }

    const users = await User.find().select("-password");
    return res.json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Fetch failed",
      details: error.message,
    });
  }
};
