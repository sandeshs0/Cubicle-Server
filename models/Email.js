const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const EmailSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipients: [
      {
        email: {
          type: String,
          required: true,
          trim: true,
          lowercase: true,
        },
        name: String,
      },
    ],
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    status: {
      type: String,
      enum: ["sent", "failed", "draft"],
      default: "draft",
    },
    opened: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    customEmailUsed: {
      type: Boolean,
      default: false,
    },
    customEmailAccount: {
      type: Schema.Types.ObjectId,
      ref: "EmailAccount",
    },
    attachments: [
      {
        filename: String,
        path: String,
        contentType: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster querying
EmailSchema.index({ sender: 1, status: 1 });
EmailSchema.index({ "recipients.email": 1 });

module.exports = mongoose.model("Email", EmailSchema);
