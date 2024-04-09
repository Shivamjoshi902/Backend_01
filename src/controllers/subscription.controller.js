import mongoose, {Types, isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscription.models.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

//controller to toggle Subscription
const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const userId = req.user?._id

    if(!isValidObjectId(channelId)){
        throw new apiError(400,"invalid channelId")
    }

    if(!channelId || !userId){
        throw new apiError(400,"channelId and userId is required")
    }

    try {
        const isSubscriptionExist = await Subscription.findOne({ userId ,channelId});
    
        if(isSubscriptionExist){
            await Subscription.deleteOne({userId , channelId})
            
            return res
            .status(200)
            .json(
                new apiResponse(200,{},"Unsubscribed Successfully")
            )
        }
        else{
            const addedSubscription = await Subscription.create(
                {
                    subscriber : userId,
                    channel : channelId
                }
            )
    
            if(!addedSubscription){
                throw new apiError(500,"Error while creating subscription in database")
            }
    
            return res.
            status(200)
            .json(
                new apiResponse(200,addedSubscription,"subscription added successfully")
            )
        }
    } catch (error) {
        throw new apiError(400,"error while toggling subscription",error)
    }

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new apiError(400,"invalid channelId")
    }

    const channel = await Subscription.findById(channelId)

    if(!channel){
        throw new apiError(400,"channel does not exist")
    }

    try {
        const getSubscribers = await Subscription.aggregate([
            {
                $match : {
                    channel : new Types.ObjectId(channelId)
                }
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'subscriber',
                    foreignField : '_id',
                    as : 'subscriberList',
                    pipeline : [
                        {
                            $project : {
                                userName : 1,
                                fullName : 1,
                                avatar :1
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new apiResponse(200,getSubscribers[0].subscriberList,"subscribers Fetched successfully")
        )
    } catch (error) {
        throw new apiError(400,"error while getting subscribers list",error)        
    }

    
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new apiError(400,"invalid subscriberId")
    }

    const subscriber = await Subscription.findById(subscriberId)

    if(!subscriber){
        throw new apiError(400,"channel does not exist")
    }

    try {
        const getChannels = await Subscription.aggregate([
            {
                $match : {
                    subscriber : new Types.ObjectId(subscriberId)
                }
            },
            {
                $lookup : {
                    from : 'users',
                    localField : 'channel',
                    foreignField : '_id',
                    as : 'channelList',
                    pipeline : [
                        {
                            $project : {
                                userName : 1,
                                fullName : 1,
                                avatar :1
                            }
                        }
                    ]
                }
            }
        ])

        return res
        .status(200)
        .json(
            new apiResponse(200,getChannels[0].channelList,"subscribed channels Fetched successfully")
        )
    } catch (error) {
        throw new apiError(400,"error while getting channel list",error)        
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}