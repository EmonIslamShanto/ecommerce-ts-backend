import mongoose from "mongoose"
import { invalidateCacheType, OrderItemType } from "../types/types.js";
import { myCache } from "../app.js";
import {Product} from "../models/product.js";
import { Order } from "../models/order.js";



export const connectDB =(uri: string)=> {
    mongoose.connect(uri , {
        dbName: "Ecommerce_TS",
    }).then(c=>console.log("Connected to DB")).catch(err=>console.log(err));
};



export const invalidateCache = async ({ product, order, admin, userId, orderId, productId}:invalidateCacheType) => {
    if(product){
        const productKeys: string[] = ["latestProducts", "categories", "adminProducts"];
        if(typeof(productId) === "string"){
            productKeys.push(`product-${productId}`);
        }
        if(typeof(productId) === "object"){
            productId.forEach(id => {
                productKeys.push(`product-${id}`);
            });
        }
        myCache.del(productKeys);
    }
    if(order){
        const orderKeys: string[] = ["all-orders", `my-orders-${userId}`, `order-${orderId}`];
        myCache.del(orderKeys);
    }
    if(admin){
        const adminKeys: string[] = ["admin-line-charts", "admin-bar-charts", "admin-pie-charts", "admin-stats"];
        myCache.del(adminKeys);
    }
};


export const reduceStock = async (orderItems: OrderItemType[]) => {
    for(let i=0; i<orderItems.length; i++){
        const order = orderItems[i];
        const product = await Product.findById(order.productId);

        if(!product){
            throw new Error("Product not found");
        }
        product.stock -= order.quantity;
        await product.save();
    }
};



export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
    if(lastMonth === 0){
        return thisMonth*100;
    }
    const percentage = (thisMonth / lastMonth) * 100;
    return Number(Math.round(percentage));
}