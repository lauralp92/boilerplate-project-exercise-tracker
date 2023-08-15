
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

// Connects to MongoDB Atlas enabling creation of schemas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true, useUnifiedTopology: true
});

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now },
});

const user = mongoose.model("user", userSchema);
const exercise = mongoose.model("exercise", exerciseSchema)

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST to /api/users with form data USERNAME to create a new user
app.post('/api/users', async (req, res) => {
  try {
    const username = req.body.username;
    const newUser = new user({ username: username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.json("An error occurred, please try again");
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const data = await user.find({});
    if (!data) {
      res.send("This user does not exist");
    } else {
      res.json(data);
    }
  } catch (err) {
    console.log(err);
    res.send("An error occurred, please try again");
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const _id = req.params._id;
    const { description, duration, date } = req.body;

    const foundUser = await user.findById(_id);
    if (!foundUser) {
      res.send("User not found");
    } else {
      const username = foundUser.username;
      const newExercise = new exercise({ userId: _id, username, description, duration });

      if (date) {
        newExercise.date = new Date(date);
      }

      const savedExercise = await newExercise.save();
      const formattedDate = savedExercise.date ? savedExercise.date.toDateString() : null;

      res.json({
        username: username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: formattedDate,
        _id
      });
    }
  } catch (err) {
    console.log(err);
    res.send("An error occurred, please try again");
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const _id = req.params._id;
    const { from, to, limit } = req.query;

    const foundUser = await user.findById(_id);
    if (!foundUser) {
      res.send("User not found");
    } else {
      const username = foundUser.username;
      let query = { userId: _id };

      if (from && to) {
        query.date = { $gte: new Date(from), $lte: new Date(to) };
      } else if (from) {
        query.date = { $gte: new Date(from) };
      } else if (to) {
        query.date = { $lte: new Date(to) };
      }

      let logQuery = exercise.find(query)
        .select('-_id description duration date')
        .limit(parseInt(limit));

      const log = await logQuery.exec();

      const formattedLog = log.map((item) => ({
        description: item.description,
        duration: item.duration,
        date: item.date.toDateString()
      }));

      res.json({
        _id,
        username,
        count: log.length,
        log: formattedLog
      });
    }
  } catch (err) {
    console.log(err);
    res.send("An error occurred, please try again");
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})