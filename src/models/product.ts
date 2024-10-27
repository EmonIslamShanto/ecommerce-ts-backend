import mongoose from 'mongoose';

const schema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a name for this product."],
        },
        photo: {
            type: String,
            required: [true, "Please provide a photo for this product."],
        },
        price: {
            type: Number,
            required: [true, "Please provide a price for this product."],
        },
        description: {
            type: String,
            required: [true, "Please provide a description for this product."],
        },
        stock: {
            type: Number,
            required: [true, "Please provide the stock for this product."],
        },
        category: {
            type: String,
            required: [true, "Please provide a category for this product."],
            trim: true,
        }
    },
    {
        timestamps: true,
    }
);

export const Product = mongoose.model('Product', schema);
