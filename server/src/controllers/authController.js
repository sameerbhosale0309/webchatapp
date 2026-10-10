import { User } from '../models/User.js';
import { OTP } from '../models/OTP.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { isGmail, sendOtpEmail } from '../utils/mailer.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function sendOtp(req, res) {
  try {
    let { email, purpose = 'register', username } = req.body;
    email = (email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide a Gmail address' });
    }

    if (!isGmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Only genuine Google (@gmail.com) email addresses are accepted.',
      });
    }

    const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    if (purpose === 'register') {
      if (username) {
        const cleanUser = username.trim();
        const existingUser = await User.findOne({
          username: { $regex: `^${escapeRegex(cleanUser)}$`, $options: 'i' },
        });
        if (existingUser) {
          return res.status(400).json({ success: false, message: 'Username is already taken' });
        }
      }
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }
    } else if (purpose === 'login') {
      const existingUser = await User.findOne({ email });
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'No registered user found with this Gmail' });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTPs for this email and purpose
    await OTP.deleteMany({ email, purpose });

    await OTP.create({ email, otp, purpose });

    await sendOtpEmail(email, otp, purpose);

    return res.status(200).json({
      success: true,
      message: `Verification code dispatched to ${email}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function register(req, res) {
  try {
    let { username, email, password, otp, avatar, bio } = req.body;

    username = (username || '').trim();
    email = (email || '').trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username, email, and password' });
    }

    if (!isGmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Only genuine Google (@gmail.com) email addresses are accepted.',
      });
    }

    if (username.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    if (!otp) {
      return res.status(400).json({ success: false, message: 'Verification OTP code is required' });
    }

    const validOtp = await OTP.findOne({ email, otp, purpose: 'register' });
    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Please request a new one.' });
    }

    const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const existingUser = await User.findOne({
      $or: [
        { email },
        { username: { $regex: `^${escapeRegex(username)}$`, $options: 'i' } }
      ],
    });
    if (existingUser) {
      const field = existingUser.email === email ? 'Email' : 'Username';
      return res.status(400).json({ success: false, message: `${field} is already registered` });
    }

    const user = await User.create({
      username,
      email,
      password,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      bio: bio || 'Hey there! I am using Echo.',
    });

    // Delete used OTP
    await OTP.deleteMany({ email, purpose: 'register' });

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      data: {
        user,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function login(req, res) {
  try {
    let { email, password, otp } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/username and password' });
    }

    const identifier = (email || '').trim();
    const escapeRegex = (str) => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: `^${escapeRegex(identifier)}$`, $options: 'i' } },
        { email: { $regex: `^${escapeRegex(identifier)}$`, $options: 'i' } },
      ],
    }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Verify email domain format if email is passed
    if (user.email && !isGmail(user.email)) {
      return res.status(400).json({
        success: false,
        message: 'Only genuine Google (@gmail.com) email accounts are accepted.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // If OTP provided during login verification
    if (otp) {
      const validOtp = await OTP.findOne({ email: user.email, otp, purpose: 'login' });
      if (!validOtp) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP code for login.' });
      }
      await OTP.deleteMany({ email: user.email, purpose: 'login' });
    }

    user.status = 'online';
    await user.save();

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    const userObj = user.toJSON();

    return res.status(200).json({
      success: true,
      data: {
        user: userObj,
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function logout(req, res) {
  try {
    if (req.user) {
      req.user.status = 'offline';
      req.user.lastSeen = new Date();
      await req.user.save();
    }

    res.clearCookie('accessToken', COOKIE_OPTIONS);
    res.clearCookie('refreshToken', COOKIE_OPTIONS);

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMe(req, res) {
  try {
    return res.status(200).json({ success: true, data: req.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString());

    res.cookie('accessToken', accessToken, COOKIE_OPTIONS);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      data: { accessToken, refreshToken: newRefreshToken, user },
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
}
