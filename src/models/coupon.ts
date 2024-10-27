import mongoose from "mongoose";

const schema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "Coupon code is required"],
        unique: true
    },
    discount: {
        type: Number,
        required: [true, "Discount is required"]
    },
    expireAt: {
        type: Date,
        required: [true, "Expire date is required"]
    }
})
export const Coupon = mongoose.model("Coupon", schema);