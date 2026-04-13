import mongoose from "mongoose";

const profileViewSchema = new mongoose.Schema(
  {
    ownerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    viewerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    profile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true
    },
    bucketKey: {
      type: String,
      required: true,
      index: true
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

profileViewSchema.index({ ownerUser: 1, viewedAt: -1 });
profileViewSchema.index({ ownerUser: 1, viewerUser: 1, viewedAt: -1 });
profileViewSchema.index({ ownerUser: 1, viewerUser: 1, bucketKey: 1 }, { unique: true });

profileViewSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const ProfileView = mongoose.model("ProfileView", profileViewSchema);

export default ProfileView;
