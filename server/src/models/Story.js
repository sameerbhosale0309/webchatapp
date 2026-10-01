import mongoose from 'mongoose';

const storySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    mediaType: {
      type: String,
      enum: ['image', 'text'],
      default: 'image',
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    bgGradient: {
      type: String,
      default: 'linear-gradient(135deg, #EE673A, #FF8A64)',
    },
    views: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      index: { expires: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: true,
  }
);

export const Story = mongoose.model('Story', storySchema);
