import { Router } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    changeAvatar,
    changeCoverImage,
    getCurrentUser,
    changeUserDetails
}     
            from "../controllers/user.controller.js"

import {upload} from "../middlewares/multer.middleware.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router=Router();

router.route("/register").post(
    upload.fields([
            {
            name: "avatar",
            maxCount:1
        },
        {
            name: "coverImage",
            maxCount:1
        }
    ]),
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJwt,logoutUser)

router.route("/refresh-Token").post(refreshAccessToken)

router.route("/update-password").post(verifyJwt,updatePassword)

router.route("/update-avatar").post(verifyJwt,upload.single("avatar"),changeAvatar)

router.route("/update-cover-image").post(verifyJwt,upload.single("coverImage"),changeCoverImage)

router.route("/get-current-user").post(verifyJwt,getCurrentUser)

router.route("/change-user-details").post(verifyJwt,changeUserDetails)


export default router