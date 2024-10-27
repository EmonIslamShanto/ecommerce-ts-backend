import { NextFunction, Request, Response } from "express";
import { TryCatch } from "../middlewares/error.js";
import { BaseQuery, NewProductRequestBody, SearchRequestQuery } from "../types/types.js";
import { Product }  from "../models/product.js";
import { rm } from "fs";
import ErrorHandler from "../utils/utility-class.js";
import { faker } from "@faker-js/faker"
import { create } from "domain";
import { myCache } from "../app.js";
import { invalidateCache } from "../utils/features.js";

export const createProduct = TryCatch(async (req: Request<{}, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {
    const { name, price, description, stock, category } = req.body;
    const photo = req.file;

    if (!photo) {
        return next(new ErrorHandler("Please provide a photo for this product.", 400))
    }

    if (!name || !price || !description || !stock || !category) {

        if (photo) {
            rm(photo.path, () => {
                console.log("Photo deleted.")
            })
        }
        return next(new ErrorHandler("Please provide all required fields.", 400))
    }
    await Product.create({
        name,
        price,
        description,
        stock,
        category: category.toLowerCase(),
        photo: photo?.path
    })

    invalidateCache({product: true, admin: true});

    return res.status(201).json({
        success: true,
        message: "Product created successfully",

    })
})


export const getLatestProducts = TryCatch(async (req: Request, res: Response, next: NextFunction) => {

    let products;

    if(myCache.has("latestProducts")){
        products = JSON.parse(myCache.get("latestProducts") as string);
    }
    else{
        products = await Product.find().sort({ createdAt: -1 }).limit(5);
        myCache.set("latestProducts", JSON.stringify(products));
    }
    

    return res.status(200).json({
        success: true,
        products
    })
})




export const getAllCatergories = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    let categories;
    if(myCache.has("categories")){
        categories = JSON.parse(myCache.get("categories") as string);
    }else{
        categories = await Product.distinct("category");
        myCache.set("categories", JSON.stringify(categories));
    }
    
    return res.status(200).json({
        success: true,
        categories
    })
})



export const getAdminProducts = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    let products;
    if(myCache.has("adminProducts")){
        products = JSON.parse(myCache.get("adminProducts") as string);
    }
    else{
        products = await Product.find().sort({ createdAt: -1 });
        myCache.set("adminProducts", JSON.stringify(products));
    }
    return res.status(200).json({
        success: true,
        products
    })
})


export const getSingleProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    let product;
    const id = req.params.id;
    if(myCache.has(`product-${id}`)){
        product = JSON.parse(myCache.get(`product-${id}`) as string);
    }else{
        product = await Product.findById(id);
        if(!product){
            return next(new ErrorHandler("Product not found", 404))
        }
        myCache.set(`product-${id}`, JSON.stringify(product));
    }
    
    return res.status(200).json({
        success: true,
        product
    })
})


export const updateProduct = TryCatch(async (req: Request<{ id: string }, {}, NewProductRequestBody>, res: Response, next: NextFunction) => {

    const { id } = req.params;
    const { name, price, description, stock, category } = req.body;
    const photo = req.file;

    const product = await Product.findById(id);

    if (!product) {
        return next(new ErrorHandler("Product not found", 404))
    }

    if (photo) {
        rm(product.photo, () => {
            console.log("Photo deleted.")
        })
        product.photo = photo.path;
    }

    if (name) {
        product.name = name;
    }
    if (price) {
        product.price = price;
    }
    if (stock) {
        product.stock = stock;
    }
    if (category) {
        product.category = category;
    }
    if (description) {
        product.description = description;
    }

    await product.save();

    invalidateCache({product: true,admin:true, productId: String(product._id)});

    return res.status(200).json({
        success: true,
        message: "Product updated successfully",

    })
})


export const deleteProduct = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
    const product = await Product.findById(req.params.id);

    if (!product) {
        return next(new ErrorHandler("Product not found", 404))
    }


    rm(product.photo, () => {
        console.log("Old Photo deleted.")
    })

    await product.deleteOne();

    invalidateCache({product: true,admin:true, productId: String(product._id)});

    return res.status(200).json({
        success: true,
        message: "Product deleted successfully",
    })
})



export const getAllProducts = TryCatch(async (req: Request<{}, {}, {}, SearchRequestQuery>, res: Response, next: NextFunction) => {
    const { search, sort, category, price } = req.query;
    const page = Number(req.query.page) || 1;

    const limit = Number(process.env.PRODUCTS_LIMIT)  || 8;
    const skip = (page - 1) * limit;

    const baseQuery: BaseQuery = {};

    if (search) {
        baseQuery.name = {
            $regex: search,
            $options: "i"
        }
    }
    if (category) {
        baseQuery.category = category;
    }
    if (price) {
        baseQuery.price = {
            $lte: Number(price)
        }
    }

    const productPromise = Product.find(baseQuery).sort(sort && { price: sort === "asc" ? 1 : -1}).skip(skip).limit(limit);
    const [products, filteredProducts ] =  await Promise.all([
        productPromise,
        Product.find(baseQuery)
    ])


    const totalPage = Math.ceil(filteredProducts.length / limit);
  
    return res.status(200).json({
        success: true,
        products,
        totalPage,
        currentPage: page,
        totalProducts: filteredProducts.length,
    })
})


// const gererateRandomProducts = async (count: number = 10) =>{

//     const products = [];
//     for (let i = 0; i < count; i++) {
//         const product = {
//             name: faker.commerce.productName(),
//             photo: "uploads\\e846be6c-ee49-4585-9455-110b26506acd.jpeg",
//             price: faker.commerce.price({min: 1000, max: 10000, dec: 0}),
//             stock: faker.commerce.price({min: 0, max: 100, dec: 0}),
//             description: faker.commerce.productDescription(),
//             category: faker.commerce.department(),
//             createdAt: new Date(faker.date.past()),
//             updatedAt: new Date(faker.date.recent()),
//             _v: 0,
            
//         };
//         products.push(product);
//     }

//     await Product.create(products);
//     console.log("Products created successfully")
// };

// const deleteRandomProducts = async (count: number = 10) => {

//     const products = await Product.find({}).skip(5);

//     for (let i = 0; i < products.length; i++) {
//         const product = products[i];
//         await product.deleteOne();
//     }
//     console.log("Products deleted successfully")
// }

