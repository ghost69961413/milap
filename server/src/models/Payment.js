import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    planId: {
      type: String,
      required: true,
      enum: ["premium_monthly", "premium_quarterly"]
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true,
      default: "INR"
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true
    },
    razorpaySignature: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: ["created", "paid", "failed"],
      default: "created",
      index: true
    },
    notes: {
      type: mongoose.Schema.Types.Mixed
    }
  },
  { timestamps: true }
);

paymentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
