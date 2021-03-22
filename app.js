require("dotenv").config();
const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.use(express.urlencoded({extended:true}));
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

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set("useCreateIndex", true); //deprecating warning using passport

const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

//integrating passport in mongoose as plugins, will hash and salt our passwords, placed after schema and before model
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

//placed after User model
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req,res)=>{
  res.render("home");
});
app.get("/login", (req,res)=>{
  res.render("login");
});
app.get("/register", (req,res)=>{
  res.render("register");
});
app.get("/secrets", (req, res)=>{
  if(req.isAuthenticated()){
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});
app.get("/logout", (req, res)=>{
  req.logout();
  res.redirect("/");
})

app.post("/register", (req, res)=>{
//mongoose passport local package
  User.register({username: req.body.username}, req.body.password, (err, user)=>{
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });
});

app.post("/login",(req, res)=>{
  passport.authenticate("local")(req, res, function(){
    res.redirect("/secrets");
  });
});

app.listen(3000);
