import mongoose from "mongoose";

const dailyUsageSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    dateKey: {
      type: String,
      required: true
    },
    interestsSentCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    }
  },
  { timestamps: true }
);

dailyUsageSchema.index({ user: 1, dateKey: 1 }, { unique: true });

dailyUsageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const DailyUsage = mongoose.model("DailyUsage", dailyUsageSchema);

export default DailyUsage;
