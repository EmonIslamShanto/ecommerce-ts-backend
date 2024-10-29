import express from 'express';
import { connectDB } from './utils/features.js';
import {errorMiddleware} from './middlewares/error.js';
import NodeCache from 'node-cache';
import { config } from 'dotenv';
import morgan from 'morgan';
import Stripe from 'stripe';
import cors from 'cors';

//import routes
import userRoute from './routes/user.js';
import productRoute from './routes/product.js';
import orderRoute from './routes/order.js';
import paymentRoute from './routes/payment.js';
import dashboardRoute from './routes/dashboard.js';

config({
    path: './.env'
});

const port = process.env.PORT || 3000;
const mongoURI = process.env.MONGO_URI || "";
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
connectDB(mongoURI);
export const stripe = new Stripe(stripeSecretKey);
export const myCache = new NodeCache();
const app = express();
app.use(express.json());
app.use(morgan("dev")); 
app.use(cors());

app.get('/', (req, res) => {
    res.send("API is working");
});



//Use routes
app.use('/api/v1/user', userRoute);
app.use('/api/v1/product', productRoute);
app.use('/api/v1/order', orderRoute);
app.use('/api/v1/payment', paymentRoute);
app.use('/api/v1/dashboard', dashboardRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);

app.listen(port, () => {
    console.log(`Server is running on port http://localhost:${port}`);
})