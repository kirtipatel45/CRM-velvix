import mongoose from 'mongoose';

const marketingEntrySkillSchema = new mongoose.Schema(
  {
    marketingEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Marketing',
      required: true,
      index: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      index: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Other',
    },
  },
  { timestamps: true }
);

marketingEntrySkillSchema.index({ marketingEntry: 1, skill: 1 }, { unique: true });

const MarketingEntrySkill = mongoose.model('MarketingEntrySkill', marketingEntrySkillSchema);
export default MarketingEntrySkill;
