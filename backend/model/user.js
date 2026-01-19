import mongoose from "mongoose";
const userSchema= new mongoose.Schema({
    fullName:{type:String,required:true},
    username:{type:String,required:true,unique:true},
    password:{type:String,required:true},
    bio:{type:String,default:""},
    location:{type:String,default:""},

});
export default mongoose.model("user",userSchema);