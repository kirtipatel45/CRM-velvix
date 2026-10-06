import mongoose from 'mongoose';

const candidateSkillSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: true,
      index: true,
    },
    skill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      required: true,
      index: true,
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1.0,
    },
    source: {
      type: String,
      enum: ['resume', 'manual'],
      default: 'resume',
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate skills for the same candidate
candidateSkillSchema.index({ candidate: 1, skill: 1 }, { unique: true });

const CandidateSkill = mongoose.model('CandidateSkill', candidateSkillSchema);
export default CandidateSkill;
