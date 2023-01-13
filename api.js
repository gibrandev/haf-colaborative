const express = require('express');
const app = express();
const port = 3001;
var cors = require('cors');
var bcrypt = require('bcryptjs');
var jwt = require('jsonwebtoken');
var bodyParser = require('body-parser');
var _ = require("lodash");

const { MongoClient, ObjectId } = require('mongodb');

const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url);

const dbName = 'multisite_mdb';

const JwtKey = "RAHASIA_:P";

const category = [
    'aktual', 'sosok', 'pelesiran', 'gaya-hidup'
];

app.use(bodyParser.json() );
app.use(bodyParser.urlencoded({
    extended: true
})); 

app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
});

app.post('/api/login', async (req, res) => {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');
    const user = await collection.findOne({username: req.body.username});

    var token = jwt.sign({ sub: user._id }, JwtKey);

    delete user.password
    await client.close();
    res.send({
        token: token,
        user: user
    });
});

app.post('/api/register', async (req, res) => {
    const db = client.db(dbName);
    const model = db.collection("users");
    var hash = bcrypt.hashSync('12345678', 8);
    const user = {
        name: "Gibran Dimasagung",
        email: "gibrandev@gmail.com",
        username: "gibrandev",
        password: hash
    }
    const result = await model.insertOne(user);

    var token = jwt.sign({ sub: result.insertedId }, JwtKey);

    await client.close();
    res.send({
        message: 'User has registered',
        token: token
    });
});

app.get('/api/user', async (req, res) => {
    var token = req.headers.authorization;
    const cleanToken = token.replace('Bearer ','');
    var decoded = jwt.verify(cleanToken, JwtKey);

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');
    const user = await collection.findOne({_id: ObjectId(decoded.sub)});

    if (!user) {
        res.status(401).send({
            message: "User invalid"
        });
    }

    delete user.password;
    await client.close();
    res.send(user)
});

app.get('/api/recommendation', async (req, res) => {
    // var token = req.headers.authorization;
    // if (token) {
    //     const user = await getUserId(token);

    //     await client.connect();
    //     const db = client.db(dbName);
    //     const collection = db.collection('recommendations');

    //     const findResult = await collection.find({ category: { $in: category }, userId: ObjectId(user) }).toArray();
    //     await client.close();

    //     var data = [];

    //     category.forEach((cat) => {
    //         const check = _.find(findResult, { 'category': cat });
    //         if (check) {
    //             data.push({
    //                 category: check.category,
    //                 hits: check.hits
    //             });
    //         } else {
    //             data.push({
    //                 category: cat,
    //                 hits: 0
    //             });
    //         }
    //     });

    //     res.status(200).send(data);
    // } else {
    //     res.status(401).send({
    //         message: "User invalid"
    //     });
    // }

    const data = await getUserRecommendation();
    res.send(data);
});

app.get('/api/latest', async (req, res) => {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('posts');
    const findResult = await collection.find({appName: 'indotnesia'}).limit(20).sort({postCreatedTime: -1}).toArray();
    await client.close();
    res.send(findResult);
});

app.get('/api/category/:slug', async (req, res) => {
    const category = req.params.slug;

    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('posts');
    const findResult = await collection.find({appName: 'indotnesia', 'category.slug': category}).limit(20).sort({postCreatedTime: -1}).toArray();
    await client.close();
    var token = req.headers.authorization;
    if (token) {
        handlePushRecommendation(token, category);
    }
    res.send(findResult);
});

app.get('/api/:slug', async (req, res) => {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('posts');
    const findResult = await collection.findOne({slug: req.params.slug});
    await client.close();
    var token = req.headers.authorization;
    if (token) {
        handlePushRecommendation(token, findResult.category.slug);
    }
    res.send(findResult);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
});

const handlePushRecommendation = async (token, category) => {
    const user = await getUserId(token);
    await client.connect();
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
    await client.close();
    return true;
}

const getUserId = async (token) => {
    const newToken = token;
    const cleanToken = newToken.replace('Bearer ','');
    var decoded = jwt.verify(cleanToken, JwtKey);
    await client.connect();
    const db = client.db(dbName);
    const user = await db.collection('users').findOne({_id: ObjectId(decoded.sub)});
    await client.close();
    if (user) {
        return user._id
    } else {
        return null;
    }
}

const getUserRecommendation = async () => {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');

    var users = await collection.find({}).toArray();

    var recommendations = [];

    for (const user of users) {
        const findResult = await db.collection('recommendations').find({ userId: ObjectId(user._id) }).toArray();
        recommendations.push(mappingCategoryUser(findResult));
    }

    await client.close();

    return recommendations;
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
    return data;
}