import { Router } from "express";
import {verifyJwt} from "../middlewares/auth.middleware.js"
import {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller.js"

const router=Router();

router.use(verifyJwt)
router.route("/toggle-subscription").patch(toggleSubscription)
router.route("/get-User-Channel-Subscribers").get(getUserChannelSubscribers)
router.route("/get-Subscribed-Channels").get(getSubscribedChannels)


export default router