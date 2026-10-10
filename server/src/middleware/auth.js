import { verifyAccessToken } from '../utils/jwt.js';
import { User } from '../models/User.js';

export async function protect(req, res, next) {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or token invalid' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired', error: err.message });
  }
}
