require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const FacebookStrategy = require("passport-facebook");

app.use(express.urlencoded({
  extended: true
}));
app.use(express.static("Public"));
app.set("view engine", "ejs");

// setting options for our sessions
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));
//initializing passport module
app.use(passport.initialize());
//letting passport manage our sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set("useCreateIndex", true); //deprecating warning using passport

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

//integrating passport in mongoose as plugins, will hash and salt our passwords, placed after schema and before model
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//placed after User model
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"

  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({
      facebookId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render("secrets");
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  }));
app.get("/auth/google/secrets",
  passport.authenticate("google", {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect
    res.redirect("/secrets");
  });

app.get("/auth/facebook",
  passport.authenticate('facebook'));
app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
  res.render("login");
});
app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/secrets", (req, res) => {
  User.find({"secret": {$ne:null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    } else {
      if(req.isAuthenticated()){
        res.render("secrets", {UsersWithSecrets: foundUsers, loggedIn:"inline", loggedOut:"none"});
      }
      else {
        res.render("secrets", {UsersWithSecrets: foundUsers, loggedIn:"none", loggedOut:"inline"});
      }
    }
  })
});
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/secrets");
})
app.get("/submit", (req, res)=>{
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
})

app.post("/register", (req, res) => {
  //mongoose passport local package
  User.register({
    username: req.body.username
  }, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login", (req, res) => {
  passport.authenticate("local")(req, res, function() {
    res.redirect("/secrets");
  });
});

app.post("/submit", (req, res)=>{
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = req.body.secret;
        foundUser.save(function(){
          res.redirect("/secrets");
        })
      }
    }
  })
})

app.listen(3000);
