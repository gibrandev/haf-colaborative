require('dotenv').config();
const express = require('express');
const app = express();
const port = 3001;
var cors = require('cors');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var _ = require("lodash");
const engine = require('./index');

const { MongoClient, ObjectId } = require('mongodb');

const url = `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOSTNAME}:${process.env.DB_PORT}/${process.env.DB_AUTH}`;
const client = new MongoClient(url);

const dbName = 'multisite_mdb';

const JwtKey = "RAHASIA_:P";

const category = [
    'aktual', 'sosok', 'pelesiran', 'gaya-hidup'
];

(async () => {
    await client.connect();
})().catch(e => {
    // Deal with the fact the chain failed
});

app.use(bodyParser.json() );
app.use(bodyParser.urlencoded({
    extended: true
})); 

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.post('/api/login', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('users');
    const user = await collection.findOne({email: req.body.email});

    if (!user) {
        res.status(401).send({
            message: "User invalid"
        });
        return
    }

    if (bcrypt.compareSync(req.body.password, user.password)) {
        var token = jwt.sign({ sub: user._id }, JwtKey);

        delete user.password
        res.send({
            token: token,
            user: user
        });
        return
    }
    res.status(400).send({
        message: "Email or password invalid"
    });
});

app.post('/api/register', async (req, res) => {
    const db = client.db(dbName);
    const model = db.collection("users");

    const checkUser = await model.findOne({email: req.body.email});
    if (checkUser) {
        res.status(400).send({
            message: "Email has already registered"
        });
        return
    }

    var hash = bcrypt.hashSync(req.body.password, 8);
    const user = {
        name: req.body.name,
        email: req.body.email,
        password: hash
    }
    const result = await model.insertOne(user);

    var token = jwt.sign({ sub: result.insertedId }, JwtKey);

    res.send({
        message: 'User has registered',
        token: token
    });
});

app.get('/api/user', async (req, res) => {
    var token = req.headers.authorization;
    if (token) {
        const cleanToken = token.replace('Bearer ','');
        var decoded = jwt.verify(cleanToken, JwtKey);
    
        const db = client.db(dbName);
        const collection = db.collection('users');
        const user = await collection.findOne({_id: ObjectId(decoded.sub)});
    
        if (!user) {
            res.status(401).send({
                message: "User invalid"
            });
        }
    
        delete user.password;
        res.send(user);
        return
    } else {
        res.status(401).send({
            message: "User invalid"
        });
        return
    }
});

app.get('/api/latest', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('posts');
    const findResult = await collection.find({appName: 'indotnesia'}).limit(20).sort({postCreatedTime: -1}).toArray();
    res.send(findResult);
});

app.get('/api/category/:slug', async (req, res) => {
    const category = req.params.slug;
    const db = client.db(dbName);
    const collection = db.collection('posts');
    const findResult = await collection.find({appName: 'indotnesia', 'category.slug': category}).limit(20).sort({postCreatedTime: -1}).toArray();
    var token = req.headers.authorization;
    if (token) {
        handlePushRecommendation(token, category);
    }
    res.send(findResult);
});

app.get('/api/:slug', async (req, res) => {
    const db = client.db(dbName);
    const collection = db.collection('posts');
    var findResult = await collection.findOne({slug: req.params.slug});
    var token = req.headers.authorization;
    var recommendations = [];
    if (token) {
        handlePushRecommendation(token, findResult.category.slug);
        const user = await getUserId(token);
        recommendations = await getUserRecommendation(user);
    }

    findResult = {...findResult, ...{recommendations: recommendations} }
    res.send(findResult);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

const handlePushRecommendation = async (token, category) => {
    const user = await getUserId(token);
    const db = client.db(dbName);
    if (user) {
        const recommendation = await db.collection('recommendations').findOne({category: category, userId: ObjectId(user)});
        if (!recommendation) {
            await db.collection("recommendations").insertOne({
                userId: user,
                category: category,
                hits: 1
            });
        } else {
            await db.collection('recommendations').updateOne({category: category, userId: ObjectId(user)}, {$set:{hits: recommendation.hits + 1}}, {});
        }
    }
    return true;
}

const getUserId = async (token) => {
    const newToken = token;
    const cleanToken = newToken.replace('Bearer ','');
    var decoded = jwt.verify(cleanToken, JwtKey);
    const db = client.db(dbName);
    const user = await db.collection('users').findOne({_id: ObjectId(decoded.sub)});
    if (user) {
        return user._id
    } else {
        return null;
    }
}

const getUserRecommendation = async (userId) => {
    const db = client.db(dbName);
    const collection = db.collection('users');

    var users = await collection.find({_id:{$ne: ObjectId(userId)}}).toArray();

    var recommendations = [];

    const me = await db.collection('recommendations').find({ userId: ObjectId(userId) }).toArray();
    recommendations.push(mappingCategoryUser(me));

    for (const user of users) {
        const findResult = await db.collection('recommendations').find({ userId: ObjectId(user._id) }).toArray();
        recommendations.push(mappingCategoryUser(findResult));
    }

    const items = engine.cfilter(recommendations,1);

    var articles = [];

    for (const item of items) {
        const slugCategory = category[item-1];
        const options = [
            { $match: { "category.slug": slugCategory, appName: 'indotnesia' } },
            { $sample: { size: 1 }}
        ];
        const projection = {
            appName: 1, title: 1, slug: 1, imagePath: 1, category: 1
        }
        const findResult = await db.collection('posts').aggregate(options).project(projection).toArray();
        articles = [...articles, ...findResult]
    }

    return articles;
}

const mappingCategoryUser = (categories) => {
    var data = [];
    for (const cat of category) {
        const check = _.find(categories, { 'category': cat });
        if (check) {
            data.push({
                category: check.category,
                hits: check.hits
            });
        } else {
            data.push({
                category: cat,
                hits: 0
            });
        }
    }

    const newData = data.map(cat => cat.hits);
    return newData;
}