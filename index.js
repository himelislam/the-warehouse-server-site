const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;


// middleware
app.use(cors())
app.use(express.json())

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.2tuf1.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const productCollection = client.db('theWarehouse').collection('products');
        // const selectedProductCollection = client.db('theWarehouse').collection('selectedProducts');


        // Auth Api
        app.post('/getToken', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken })
        })

        // get all products
        // http://localhost:5000/products
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray()
            res.send(products)
        })

        // get single product
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const product = await productCollection.findOne(query);
            res.send(product)
        })

        // delete a product 
        app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

        // update a product
        app.patch('/product/:id', async (req, res) => {
            const id = req.params.id;
            const quantity = req.body.quantity;
            const newQuantity = quantity - 1;
            const sold = req.body.sold;
            const newSoldQuantity = sold + 1;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    quantity: newQuantity,
                    sold : newSoldQuantity
                },
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // restock a product
        app.patch('/product/restock/:id', async (req, res) => {
            const id = req.params.id;
            const newQuantity = req.body.newQuantity;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    quantity: newQuantity
                },
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

       

        // post a new product 
        app.post('/myItems', async (req, res) => {
            const product = req.body;
            const result = await productCollection.insertOne(product);
            res.send(result)
        })

        // get the selected products my items
        app.get('/myItems', verifyToken, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email }
                const cursor = productCollection.find(query)
                const products = await cursor.toArray();
                res.send(products)
            }
            else{
                res.status(403).send({message: 'Forbidden Access'})
            }
        })

        app.delete('/myItems/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })

         // put email to existing product
         app.put('/myItems/:id', async(req, res)=> {
            const id = req.params.id;
            const email = req.body.email;
            const filter = {_id: ObjectId(id)};
            const options = {upsert : true};
            const updateDoc = {
                $set : {
                    email : email
                },
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })
    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('The WareHouse Server Running')
})

app.listen(port, () => {
    console.log('Listening', port);
})