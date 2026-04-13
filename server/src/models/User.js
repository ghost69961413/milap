import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { ADMIN_LEVELS, ALL_USER_ROLES, USER_ROLES } from "../constants/roles.js";

const policeVerificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true
    },
    documentUrl: {
      type: String,
      trim: true
    },
    documentPublicId: {
      type: String,
      trim: true
    },
    documentMimeType: {
      type: String,
      trim: true
    },
    submittedAt: {
      type: Date
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { _id: false }
);

const verificationDocumentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true
    },
    publicId: {
      type: String,
      trim: true
    },
    mimeType: {
      type: String,
      trim: true
    },
    sizeBytes: {
      type: Number,
      min: 0
    },
    submittedAt: {
      type: Date
    }
  },
  { _id: false }
);

const verificationDocumentsSchema = new mongoose.Schema(
  {
    policeVerification: {
      type: verificationDocumentSchema
    },
    governmentId: {
      type: verificationDocumentSchema
    },
    additionalOptionalDocument: {
      type: verificationDocumentSchema
    },
    lawDegree: {
      type: verificationDocumentSchema
    },
    decoratorOwnerGovernmentId: {
      type: verificationDocumentSchema
    },
    decoratorPoliceNoc: {
      type: verificationDocumentSchema
    }
  },
  { _id: false }
);

const consultantApprovalSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      required: true
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  { _id: false }
);

const CONSULTANT_REQUEST_STATUSES = ["none", "pending", "approved", "rejected"];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, "Enter a valid Indian mobile number"]
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      required: true
    },
    profileFor: {
      type: String,
      enum: ["self", "son", "daughter", "brother", "sister", "friend", "relative"],
      required: true
    },
    role: {
      type: String,
      enum: ALL_USER_ROLES,
      default: USER_ROLES.NORMAL_USER,
      index: true
    },
    adminLevel: {
      type: String,
      enum: Object.values(ADMIN_LEVELS),
      default: null
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    policeVerification: {
      type: policeVerificationSchema,
      default: () => ({
        status: "pending"
      })
    },
    verificationDocuments: {
      type: verificationDocumentsSchema,
      default: () => ({})
    },
    consultantApproval: {
      type: consultantApprovalSchema,
      default: () => ({
        status: "approved"
      })
    },
    consultantRequestStatus: {
      type: String,
      enum: CONSULTANT_REQUEST_STATUSES,
      default: "none",
      index: true
    },
    consultantRequestAppliedAt: {
      type: Date
    },
    consultantRequestReviewedAt: {
      type: Date
    },
    consultantRequestReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    consultantRequestRejectionReason: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ role: 1, "policeVerification.status": 1 });
userSchema.index({ role: 1, "consultantApproval.status": 1 });
userSchema.index({ consultantRequestStatus: 1, role: 1 });
userSchema.index({ role: 1, adminLevel: 1 });

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

const User = mongoose.model("User", userSchema);

export default User;
