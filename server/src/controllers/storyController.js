import { Story } from '../models/Story.js';
import { User } from '../models/User.js';

export async function createStory(req, res) {
  try {
    const { mediaUrl, mediaType = 'image', caption, bgGradient } = req.body;

    if (!mediaUrl && !caption) {
      return res.status(400).json({ success: false, message: 'Story must have image URL or caption' });
    }

    const story = await Story.create({
      user: req.userId,
      mediaUrl: mediaUrl || '',
      mediaType: mediaUrl ? 'image' : mediaType,
      caption: caption || '',
      bgGradient: bgGradient || 'linear-gradient(135deg, #EE673A, #FF8A64)',
      views: [], // Creator view is excluded from initial view count
    });

    const populated = await Story.findById(story._id).populate('user', 'username avatar email');
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getStories(req, res) {
  try {
    // Get non-expired stories
    const stories = await Story.find({ expiresAt: { $gt: new Date() } })
      .populate('user', 'username avatar email bio status')
      .populate('views', 'username avatar')
      .sort({ createdAt: -1 });

    // Group stories by user
    const userStoriesMap = new Map();

    stories.forEach((story) => {
      const uId = story.user._id.toString();
      if (!userStoriesMap.has(uId)) {
        userStoriesMap.set(uId, {
          user: story.user,
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = userStoriesMap.get(uId);
      const isOwner = uId === req.userId.toString();
      const isViewedByMe = isOwner || story.views.some((v) => (v._id ? v._id.toString() : v.toString()) === req.userId);
      
      if (!isViewedByMe && !isOwner) {
        group.hasUnviewed = true;
      }

      group.stories.push({
        ...story.toJSON(),
        isViewed: isViewedByMe,
      });
    });

    const result = Array.from(userStoriesMap.values());
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function viewStory(req, res) {
  try {
    const { id } = req.params;
    const story = await Story.findById(id);

    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }

    const storyOwnerId = story.user.toString();
    const currentUserId = req.userId.toString();

    // Only increment view count if viewer is a DIFFERENT user (not the story creator)
    if (storyOwnerId !== currentUserId) {
      const alreadyViewed = story.views.some(
        (v) => (v._id ? v._id.toString() : v.toString()) === currentUserId
      );
      if (!alreadyViewed) {
        story.views.push(req.userId);
        await story.save();
      }
    }

    return res.status(200).json({ success: true, message: 'Story viewed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
