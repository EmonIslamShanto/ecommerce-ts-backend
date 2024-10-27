import mongoose from "mongoose";
import { trim } from "validator";

const schema =  new mongoose.Schema(
    {
        shippingInfo: {
            address: {
                type: String,
                required: [true, "Please provide an address for shipping."],
            },
            city: {
                type: String,
                required: [true, "Please provide a city for shipping."],
            },
            state: {
                type: String,
                required: [true, "Please provide a state for shipping."],
            },
            phoneNo: {
                type: String,
                required: [true, "Please provide a phone number for shipping."],
            },
            postalCode: {
                type: String,
                required: [true, "Please provide a postal code for shipping."],
            },
            country: {
                type: String,
                required: [true, "Please provide a country for shipping."],
            },
        },
        user: {
            type: String,
            required: true,
            ref: "User",
        },
        subtotal: {
            type: Number,
            required: true,
        },
        tax: {
            type: Number,
            required: true,
        },
        shippingCharge: {
            type: Number,
            required: true,
        },
        discount: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["Processing", "Shipped", "Delivered", "Cancelled"],
            default: "Processing",
        },
        orderItems: [
            {
                name: {
                    type: String,
                    required: true,
                },
                quantity: {
                    type: Number,
                    required: true,
                },
                photo: {
                    type: String,
                    required: true,
                },
                price: {
                    type: Number,
                    required: true,
                },
                productId: {
                    type: String,
                    required: true,
                    ref: "Product",
                },
            },
        ]
        
    },
    {
        timestamps: true,
    }
);

export const Order = mongoose.model("Order", schema);