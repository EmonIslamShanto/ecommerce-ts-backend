import { stripe } from "../app.js";
import { TryCatch } from "../middlewares/error.js";
import { Coupon } from "../models/coupon.js";
import ErrorHandler from "../utils/utility-class.js";

export const createPaymentIntent = TryCatch(async(req, res, next) => {
    const { amount } = req.body;

    if(!amount ) {
        return next (new ErrorHandler("Please enter amount", 400));
    }
    const paymentIntent = await stripe.paymentIntents.create({amount: Number(amount)*100, currency: 'usd'});

    return res.status(201).json({
        success: true,
        client_secret: paymentIntent.client_secret
    })
});
export const createCoupon = TryCatch(async(req, res, next) => {
    const { coupon, discount, expireAt } = req.body;

    if(!coupon || !discount || !expireAt) {
        return next (new ErrorHandler("Please fill in all fields", 400));
    }
    await Coupon.create({code: coupon, discount, expireAt});

    return res.status(201).json({
        success: true,
        message: "Coupon created successfully"
    })
});


export const applyDiscount = TryCatch(async(req, res, next) => {
    const { coupon } = req.query;

    const discount = await Coupon.findOne({code: coupon});
    if(!discount) {
        return next(new ErrorHandler("Invalid coupon", 404));
    }
    if (discount.expireAt < new Date()) {
        return next(new ErrorHandler('The coupon has already expired.', 404));
    }

    return res.status(200).json({
        success: true,
        discount: discount.discount
    })
});


export const getAllCoupons = TryCatch(async(req, res, next) => {


    const coupons = await Coupon.find();
    
    if(coupons.length === 0) {
        return next(new ErrorHandler("No coupons found", 404));
    }

    return res.status(200).json({
        success: true,
        coupons
    })
});


export const deleteCoupon = TryCatch(async(req, res, next) => {

    const { id } = req.params;

    const coupon = await Coupon.findById(id);
    
    if(!coupon) {
        return next(new ErrorHandler("Coupon no found", 404));
    }

    await coupon.deleteOne();

    return res.status(200).json({
        success: true,
        message: "Coupon deleted successfully"
    })
});