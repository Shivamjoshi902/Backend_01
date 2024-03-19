import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"

const generateRefreshAndAccessTokens =async (userId) =>{
    try {

        const user=User.findById(userId)
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

const loginUser=asyncHandler(
    //get userName or email from user 
    //get password and check validation
    //send cookies (access and refresh token)

    async (req,res)=>{
        const {userName,email,password} = req.body

        if(!(userName || email)){
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

        const {refreshToken,accessToken} = generateRefreshAndAccessTokens(user._id)

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
            "user logged in seccessfully")
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

export {registerUser,loginUser,logoutUser}