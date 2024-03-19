import jwt from "jsonwebtoken"
import { asyncHandler } from "../utils/asyncHandler"
import { apiError } from "../utils/apiError"
import { User } from "../models/user.models"

export const verifyJwt = asyncHandler(
    async (req,res,next) =>{
       try {
         const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
 
         if(!token){
             throw new apiError(400,"unauthorized request")
         }
 
         const decodedToken = jwt.verify("token",process.env.ACCESS_TOKEN_SECRET)
 
         if(!decodedToken){
             throw new apiError(400,"invalid token")
         }
 
         const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
 
         if(!user){
             throw new apiError(400,"user not found by provided token")
         }
 
         req.user=user;
         next()
       } catch (error) {
            throw new apiError(400,error.message || "invalid token");
       }

    }
)