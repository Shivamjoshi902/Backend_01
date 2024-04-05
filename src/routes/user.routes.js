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
    changeUserDetails,
    getUserChannelDetails,
    getUserWatchHistory
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

router.route("/update-avatar").patch(verifyJwt,upload.single("avatar"),changeAvatar)

router.route("/update-cover-image").patch(verifyJwt,upload.single("coverImage"),changeCoverImage)

router.route("/get-current-user").get(verifyJwt,getCurrentUser)

router.route("/change-user-details").patch(verifyJwt,changeUserDetails)

router.route("/get-user-channel-details").get(verifyJwt,getUserChannelDetails)

router.route("/get-user-watch-history").get(verifyJwt,getUserWatchHistory)



export default router