import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateRefreshAndAccessTokens =async (userId) =>{
    try {

        const user=await User.findById(userId)
        const refreshToken = user.generateRefreshTokens()
        const accessToken = user.generateAccessTokens()
        
        
        user.refreshToken=refreshToken;
        await  user.save({validateBeforeSave:false})

        return {refreshToken,accessToken}

    } catch (error) {
        throw new apiError(400,"unable to generate refreshToken and accessToken")
    }

}

const registerUser= asyncHandler(
    async(req,res)=>{
        //get data from frontend
        //validation check -if empty
        //check if user already exist: username,email
        //check for images and files:avatar,coverImage
        //upload on cloudinary
        //create entry in db-user object
        //remove password and refresh token field from response
        //ckeck for user creation
        //return response

        const {fullName,email,userName,password}=req.body

        if(
            [fullName,email,userName,password].some((field)=>field.trim()==="")
        ){
            throw new apiError(400,"all field are required")
        }

        const isUserExist= await User.findOne(
            {
                $or: [{userName},{email}]
            }
        )
        if(isUserExist){
            throw new apiError(400,"user already exist")
        }

        const avatarLocalPath=req.files?.avatar[0]?.path

        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }

        if(!avatarLocalPath){
            throw new apiError(400,"avtar is required 1")
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar){
            throw new apiError(400,"avtar is required 2")
        }

        const user= await User.create(
            {
                fullName,
                email,
                password,
                userName,
                avatar:avatar.url,
                coverImage:coverImage?.url || "",
            }
        )

        const createdUser= await User.findById(user._id).select(
            "-password -refreshToken"
        )
        
        if(!createdUser){
            throw new apiError(500,"error while saving user data")
        }

        
        return res.status(201).json(
            new apiResponse(200, createdUser, "User registered Successfully")
        )
    }
)

const loginUser= asyncHandler(
    //get userName or email from user 
    //get password and check validation
    //send cookies (access and refresh token)

    async (req,res)=>{
        const {userName,email,password} = req.body;

        if(!userName || !email){
            throw new apiError(400,"email or userName required")
        }

        const user = await User.findOne({
            $or:[{userName},{email}]
        })

        if(!user){
            throw new apiError(400,"user is not registered")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid){
            throw new apiError(400,"Password is incorrect")
        }

        const {refreshToken,accessToken} =await generateRefreshAndAccessTokens(user._id)


        const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new apiResponse(200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully")
        )
    }
)

const logoutUser=asyncHandler(
    async(req,res)=>{
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    refreshToken:undefined
                }
            },
            {
                new:true
            }
        )

        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken",options)
        .json(
            new apiResponse(200,{},"user is successfully logged out")
        )
    }
)

const refreshAccessToken = asyncHandler(
    async(req,res) => {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken){
            throw new apiError(400,"invaild refreshAccessToken request")
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        if(!decodedToken){
        throw new apiError(400,"invaild jwt request")
        }

        const user = await User.findById(decodedToken?._id)

        if(!user){
            throw new apiError(400,"user not found by provided info")
        }

        if(incomingRefreshToken !== user.refreshToken){
            throw new apiError(400,"given token does not match token hold by user")
        }


        const {refreshToken : newRefreshToken, accessToken : newAccessToken} = await generateRefreshAndAccessTokens(user._id)
      
        const options = {
            httpOnly : true,
            secure : true
        }

        return res.status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new apiResponse(
                200,
                {
                    accessToken:newAccessToken,
                    refreshToken:newRefreshToken
                },
                "Token Updated successfully"
                )
        )

    } 
)

const updatePassword = asyncHandler(
    async(req,res) => {
        const {oldPassword,newPassword} = req.body

        if(!oldPassword || !newPassword){
            throw new apiError(400,"please provide required fields")
        }
        const user = await User.findById(req.user?._id)

        if(!user){
            throw new apiError(400,"user not found")
        }

        const isPasswordRight = await user.isPasswordCorrect(oldPassword)

        if(!isPasswordRight){
            throw new apiError(400,"your password is incorrect")
        }

        user.password = newPassword;
        await user.save({validateBeforeSave : false})
        
        return res.status(200)
        .json(
            new apiResponse(200,{},"password changed successfully")
        )
    }
)

const changeAvatar = asyncHandler(
    async(req,res) => {
        const localFilePath = req.file?.path

        if(!localFilePath){
            throw new apiError(400,"Avatar path not found while updating it")
        }

        const avatar = await uploadOnCloudinary(localFilePath)

        if(!avatar.url){
            throw new apiError(400,"error while uploading on cloudinary")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    avatar : avatar.url
                }
            },
            {
                new : true
            }
        ).select("-password")

        return res
        .status(200)
        .json(
            new apiResponse(200,user,"Avatar updated successfully")
        )
    }
)

const changeCoverImage = asyncHandler(
    async(req,res) => {
        const localFilePath = req.file?.path

        if(!localFilePath){
            throw new apiError(400,"CoverImage path not found while updating it")
        }

        const coverImage = await uploadOnCloudinary(localFilePath)

        if(!coverImage.url){
            throw new apiError(400,"error while uploading on cloudinary")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    coverImage : coverImage.url
                }
            },
            {
                new : true
            }
        ).select("-password")

        return res
        .status(200)
        .json(
            new apiResponse(200,user,"coverImage updated successfully")
        )
    }
)

const getCurrentUser = asyncHandler(
    async(req, res) => {
        return res
        .status(200)
        .json(new apiResponse(200, req.user, "current user fetched successfully"))
    }
)

const changeUserDetails = asyncHandler(
    async(req,res) => {
        const {newFullName,newEmail} = req.body

        if(!newFullName || !newEmail){
            throw new apiError(400,"all fields are required")
        }

        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set : {
                    email : newEmail,
                    fullName : newFullName
                }
            },
            {new : true}
        ).select("-password -refreshToken")

        return res
        .status(200)
        .json(
            new apiResponse(200,user,"email and userName updated successfully")
        )
    }
)

const getUserChannelDetails = asyncHandler(
    async(req,res) => {

        const {userName} = req.query

        if(!userName?.trim()){
            throw new apiError(400,"userName is required")
        }

        const channel = await User.aggregate([
            {
                $match : {
                userName : userName?.toLowerCase()
                }
            },
            {
                $lookup : {
                    from : "subscriptions",
                    localField : "_id",
                    foreignField : "channel",
                    as : "subscribers"
                }
            },
            {
                $lookup : {
                    from : "subscriptions",
                    localField : "_id",
                    foreignField : "subscriber",
                    as : "subscribedTo"
                }
            },
            {
                $addFields : {
                    subscribersCount : {
                        $size : "$subscribers"
                    },
                    channelSubscribedToCount : {
                        $size : "$subscribedTo"
                    },
                    isSubscribed : {
                        $cond : {
                            if : {$in : [req.user?._id,"$subscribers.subscriber"]},
                            then : true,
                            else : false
                        }
                    }
                }
            },
            {
                $project : {
                    fullName:1,
                    userName:1,
                    email:1,
                    avatar:1,
                    coverImage:1,
                    isSubscribed:1,
                    subscribersCount:1,
                    channelSubscribedToCount:1
                }
            }
        ])  

        if(!channel.length){
            throw new apiError(400,"channel does not exist")
        }

        return res
        .status(200)
        .json(
            new apiResponse(200,channel[0],"user channel details fetched successfully")
        )
    }
)

const getUserWatchHistory = asyncHandler(
    async(req,res) => {
        const user = await User.aggregate([
            {
                $match : {
                    _id : new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup : {
                    from : "videos",
                    localField : "watchHistory",
                    foreignField : "_id",
                    as : "watchHistory",
                    pipeline : [
                        {
                            $lookup : {
                                from : "users",
                                localField : "owner",
                                foreignField : "_id",
                                as : "owner",
                                pipeline : [
                                    {
                                        $project : {
                                            fullName : 1,
                                            userName : 1,
                                            avatar : 1,
                                        }
                                    }
                                ],
                            }    
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new apiResponse(200,user[0].watchHistory,"watchHistory Fetched Successfully")
        )
    }
)



export {
            registerUser,
            loginUser,
            logoutUser,
            refreshAccessToken,
            changeAvatar,
            changeCoverImage,
            updatePassword,
            changeUserDetails,
            getCurrentUser,
            getUserChannelDetails,
            getUserWatchHistory
}


//Bhai Async Await Ne Bhot Parechan Kar Diya 
//isse bachke rehna