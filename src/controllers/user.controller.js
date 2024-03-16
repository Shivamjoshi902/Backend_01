import {asyncHandler} from "../utils/asyncHandler.js"
import {apiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {apiResponse} from "../utils/apiResponse.js"


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

        const isUserExist=User.findOne(
            {
                $or: [{userName},{email}]
            }
        )
        if(isUserExist){
            throw new apiError(400,"user already exist")
        }

        const avatarLocalPath=req.files?.avatar[0]?.path
        const coverImageLocalPath=req.files?.coverImage[0]?.path

        if(!avatarLocalPath){
            throw apiError(400,"avtar is required")
        }

        const avatar=await uploadOnCloudinary(avatarLocalPath)
        const coverImage=await uploadOnCloudinary(coverImageLocalPath)

        if(!avatar){
            throw apiError(400,"avtar is required")
        }

        const user=User.create(
            {
                fullName,
                email,
                password,
                userName,
                avatar:avatar.url,
                coverImage:coverImage?.url || "",
            }
        )

        const createdUser=User.findById(user._id).select(
            "-password -refreshToken"
        )
        
        if(!createdUser){
            throw apiError(500,"error while saving user data")
        }

        return res.status(201).json(
            apiResponse(201,createdUser,"user is registered successfully")
        )
    }
)

export {registerUser}