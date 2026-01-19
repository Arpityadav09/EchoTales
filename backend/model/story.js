import mongoose from 'mongoose';
const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    authorName: { type: String, required: true },
    genres: [{ type: String }],
    content: { type: String, required: true },
    readTime:{type:Number,required:true},
    listenTime:{type:Number,required:true},
    createdAt: { type: Date, default: Date.now }
  }, { timestamps: true });

  export default mongoose.model('Story', storySchema);
  
