import mongoose,{Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema({
    videoFile:{
        type:String,
        required:true,
    },
    owner:{
        type:mongoose.Types.ObjectId,
        ref:'User',
    },
    thumbnail:{
        type:String,
        required:true,
    },
    title:{
        type:String,
        required:true,
    },
    description:{
        type:String,
        required:true,
    },
    duration:{
        type:Number,
        required:true,
    },
    views:{
        type:Number,
        default:0
    },
    isPublished:{
        type:Number,
        required:true,
    },
},
{
    timestamps:true
}
)

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model('Video',videoSchema)